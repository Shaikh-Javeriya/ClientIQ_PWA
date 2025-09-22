from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import random
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Client Profitability Dashboard API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper functions
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, dict):
                data[key] = prepare_for_mongo(value)
    return data

def parse_from_mongo(item):
    """Parse ISO strings back to datetime objects from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str) and key.endswith(('_date', '_at', 'timestamp')):
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
    return item

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Auth Error: {e}")
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        print(f"User not found: {email}")
        raise credentials_exception
    return user

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    tier: str  # Enterprise, SMB, Freelance
    region: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    hourly_rate: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    description: Optional[str] = None
    hourly_rate: float
    hours_worked: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    project_id: Optional[str] = None
    amount: float
    hours_billed: float
    invoice_date: datetime
    due_date: datetime
    paid_date: Optional[datetime] = None
    status: str = "unpaid"  # unpaid, paid, overdue
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KPIResponse(BaseModel):
    total_revenue: float
    gross_profit: float
    gross_margin_percent: float
    outstanding_ar: float
    days_sales_outstanding: float
    billable_hours: float

class ClientProfitability(BaseModel):
    client_id: str
    client_name: str
    tier: str
    region: str
    revenue: float
    hours_worked: float
    profit: float
    margin_percent: float
    profit_per_hour: float
    outstanding_ar: float
    last_invoice_date: Optional[datetime] = None

class RevenueByMonth(BaseModel):
    month: str
    revenue: float
    profit: float

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Client Profitability Dashboard API is running"}

# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(email=user_data.email, name=user_data.name)
    user_dict = prepare_for_mongo(user.dict())
    user_dict["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(**{k: v for k, v in user.items() if k != "hashed_password"})
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

# Sample data generation
@api_router.post("/data/generate-sample")
async def generate_sample_data(current_user: dict = Depends(get_current_user)):
    # Clear existing data
    await db.clients.delete_many({})
    await db.projects.delete_many({})
    await db.invoices.delete_many({})
    
    # Generate clients
    client_names = [
        "TechCorp Solutions", "Digital Marketing Pro", "StartupXYZ", "Enterprise Global",
        "Creative Agency", "E-commerce Plus", "FinTech Innovations", "Healthcare Systems",
        "Educational Services", "Manufacturing Co", "Real Estate Group", "Legal Partners"
    ]
    
    tiers = ["Enterprise", "SMB", "Freelance"]
    regions = ["North America", "Europe", "Asia Pacific", "Latin America"]
    
    clients = []
    for i, name in enumerate(client_names):
        client = Client(
            name=name,
            tier=random.choice(tiers),
            region=random.choice(regions),
            contact_email=f"contact@{name.lower().replace(' ', '')}.com",
            hourly_rate=random.uniform(75, 250)
        )
        clients.append(client)
        await db.clients.insert_one(prepare_for_mongo(client.dict()))
    
    # Generate projects and invoices
    for client in clients:
        num_projects = random.randint(1, 3)
        for j in range(num_projects):
            project = Project(
                client_id=client.id,
                name=f"Project {j+1} for {client.name}",
                description=f"Strategic project for {client.name}",
                hourly_rate=client.hourly_rate,
                hours_worked=random.uniform(20, 200)
            )
            await db.projects.insert_one(prepare_for_mongo(project.dict()))
            
            # Generate invoices for this project
            num_invoices = random.randint(2, 6)
            for k in range(num_invoices):
                invoice_date = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 365))
                due_date = invoice_date + timedelta(days=30)
                
                hours_billed = random.uniform(10, 50)
                amount = hours_billed * project.hourly_rate
                
                # Determine payment status
                if invoice_date < datetime.now(timezone.utc) - timedelta(days=random.randint(0, 90)):
                    if random.random() > 0.3:  # 70% chance of being paid
                        paid_date = due_date + timedelta(days=random.randint(-5, 15))
                        status = "paid"
                    else:
                        paid_date = None
                        status = "overdue" if due_date < datetime.now(timezone.utc) else "unpaid"
                else:
                    paid_date = None
                    status = "unpaid"
                
                invoice = Invoice(
                    client_id=client.id,
                    project_id=project.id,
                    amount=amount,
                    hours_billed=hours_billed,
                    invoice_date=invoice_date,
                    due_date=due_date,
                    paid_date=paid_date,
                    status=status
                )
                await db.invoices.insert_one(prepare_for_mongo(invoice.dict()))
    
    return {"message": "Sample data generated successfully"}

# CRUD endpoints for clients
@api_router.get("/clients")
async def get_clients(current_user: dict = Depends(get_current_user)):
    try:
        clients = await db.clients.find().to_list(length=None)
        parsed_clients = []
        for client in clients:
            # Remove MongoDB _id and parse dates
            if '_id' in client:
                del client['_id']
            parsed_client = parse_from_mongo(client)
            parsed_clients.append(parsed_client)
        return parsed_clients
    except Exception as e:
        print(f"Error getting clients: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch clients")

@api_router.post("/clients")
async def create_client(client_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        # Create a new client with UUID
        client = {
            "id": str(uuid.uuid4()),
            "name": client_data.get("name", ""),
            "tier": client_data.get("tier", ""),
            "region": client_data.get("region", ""),
            "contact_email": client_data.get("contact_email", ""),
            "contact_phone": client_data.get("contact_phone", ""),
            "hourly_rate": float(client_data.get("hourly_rate", 0)),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        client_dict = prepare_for_mongo(client)
        await db.clients.insert_one(client_dict)
        return client
    except Exception as e:
        print(f"Error creating client: {e}")
        raise HTTPException(status_code=500, detail="Failed to create client")

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        update_data = {
            "name": client_data.get("name", ""),
            "tier": client_data.get("tier", ""),
            "region": client_data.get("region", ""),
            "contact_email": client_data.get("contact_email", ""),
            "contact_phone": client_data.get("contact_phone", ""),
            "hourly_rate": float(client_data.get("hourly_rate", 0))
        }
        
        update_dict = prepare_for_mongo(update_data)
        result = await db.clients.update_one({"id": client_id}, {"$set": update_dict})
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
            
        # Return updated client
        updated_client = await db.clients.find_one({"id": client_id})
        if '_id' in updated_client:
            del updated_client['_id']
        return parse_from_mongo(updated_client)
    except Exception as e:
        print(f"Error updating client: {e}")
        raise HTTPException(status_code=500, detail="Failed to update client")

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Delete client and associated projects and invoices
        result = await db.clients.delete_one({"id": client_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
            
        await db.projects.delete_many({"client_id": client_id})
        await db.invoices.delete_many({"client_id": client_id})
        return {"message": "Client deleted successfully"}
    except Exception as e:
        print(f"Error deleting client: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete client")

# CRUD endpoints for invoices
@api_router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    try:
        invoices = await db.invoices.find().to_list(length=None)
        parsed_invoices = []
        for invoice in invoices:
            if '_id' in invoice:
                del invoice['_id']
            parsed_invoice = parse_from_mongo(invoice)
            parsed_invoices.append(parsed_invoice)
        return parsed_invoices
    except Exception as e:
        print(f"Error getting invoices: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch invoices")

@api_router.post("/invoices")
async def create_invoice(invoice_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        # Create a new invoice with UUID
        invoice = {
            "id": str(uuid.uuid4()),
            "client_id": invoice_data.get("client_id", ""),
            "project_id": invoice_data.get("project_id"),
            "amount": float(invoice_data.get("amount", 0)),
            "hours_billed": float(invoice_data.get("hours_billed", 0)),
            "invoice_date": invoice_data.get("invoice_date"),
            "due_date": invoice_data.get("due_date"),
            "paid_date": invoice_data.get("paid_date"),
            "status": invoice_data.get("status", "unpaid"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        invoice_dict = prepare_for_mongo(invoice)
        await db.invoices.insert_one(invoice_dict)
        return invoice
    except Exception as e:
        print(f"Error creating invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to create invoice")

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, invoice_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        update_data = {
            "client_id": invoice_data.get("client_id", ""),
            "project_id": invoice_data.get("project_id"),
            "amount": float(invoice_data.get("amount", 0)),
            "hours_billed": float(invoice_data.get("hours_billed", 0)),
            "invoice_date": invoice_data.get("invoice_date"),
            "due_date": invoice_data.get("due_date"),
            "paid_date": invoice_data.get("paid_date"),
            "status": invoice_data.get("status", "unpaid")
        }
        
        update_dict = prepare_for_mongo(update_data)
        result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_dict})
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
            
        # Return updated invoice
        updated_invoice = await db.invoices.find_one({"id": invoice_id})
        if '_id' in updated_invoice:
            del updated_invoice['_id']
        return parse_from_mongo(updated_invoice)
    except Exception as e:
        print(f"Error updating invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to update invoice")

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await db.invoices.delete_one({"id": invoice_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice deleted successfully"}
    except Exception as e:
        print(f"Error deleting invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete invoice")

@api_router.put("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await db.invoices.update_one(
            {"id": invoice_id}, 
            {"$set": {
                "status": "paid",
                "paid_date": datetime.now(timezone.utc).isoformat()
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice marked as paid"}
    except Exception as e:
        print(f"Error marking invoice as paid: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark invoice as paid")

# AR Aging endpoint
@api_router.get("/invoices/ar-aging")
async def get_ar_aging(current_user: dict = Depends(get_current_user)):
    try:
        unpaid_invoices = await db.invoices.find({"status": {"$in": ["unpaid", "overdue"]}}).to_list(length=None)
        
        aging_buckets = {
            "0-30": 0,
            "31-60": 0,
            "61-90": 0,
            "90+": 0
        }
        
        current_date = datetime.now(timezone.utc)
        
        for invoice in unpaid_invoices:
            try:
                due_date_str = invoice.get("due_date", "")
                if due_date_str:
                    if isinstance(due_date_str, str):
                        due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                    else:
                        due_date = due_date_str
                    
                    days_overdue = (current_date - due_date).days
                    amount = invoice.get("amount", 0)
                    
                    if days_overdue <= 30:
                        aging_buckets["0-30"] += amount
                    elif days_overdue <= 60:
                        aging_buckets["31-60"] += amount
                    elif days_overdue <= 90:
                        aging_buckets["61-90"] += amount
                    else:
                        aging_buckets["90+"] += amount
            except Exception as e:
                print(f"Error processing invoice {invoice.get('id', 'unknown')}: {e}")
                continue
        
        return aging_buckets
    except Exception as e:
        print(f"Error getting AR aging: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch AR aging data")

# Dashboard endpoints
@api_router.get("/dashboard/kpis", response_model=KPIResponse)
async def get_kpis(current_user: dict = Depends(get_current_user)):
    # Get all invoices
    invoices = await db.invoices.find().to_list(length=None)
    
    total_revenue = sum(inv["amount"] for inv in invoices if inv["status"] == "paid")
    outstanding_ar = sum(inv["amount"] for inv in invoices if inv["status"] in ["unpaid", "overdue"])
    total_hours = sum(inv["hours_billed"] for inv in invoices)
    
    # Estimate gross profit (assuming 25% overhead)
    gross_profit = total_revenue * 0.75
    gross_margin_percent = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    # Calculate DSO (simplified)
    days_sales_outstanding = 45.0  # Placeholder calculation
    
    return KPIResponse(
        total_revenue=total_revenue,
        gross_profit=gross_profit,
        gross_margin_percent=gross_margin_percent,
        outstanding_ar=outstanding_ar,
        days_sales_outstanding=days_sales_outstanding,
        billable_hours=total_hours
    )

@api_router.get("/dashboard/client-profitability", response_model=List[ClientProfitability])
async def get_client_profitability(current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find().to_list(length=None)
    result = []
    
    for client in clients:
        invoices = await db.invoices.find({"client_id": client["id"]}).to_list(length=None)
        projects = await db.projects.find({"client_id": client["id"]}).to_list(length=None)
        
        revenue = sum(inv["amount"] for inv in invoices if inv["status"] == "paid")
        hours_worked = sum(proj["hours_worked"] for proj in projects)
        outstanding_ar = sum(inv["amount"] for inv in invoices if inv["status"] in ["unpaid", "overdue"])
        
        # Calculate profit (revenue - estimated costs)
        profit = revenue * 0.75  # Assuming 25% overhead
        margin_percent = (profit / revenue * 100) if revenue > 0 else 0
        profit_per_hour = profit / hours_worked if hours_worked > 0 else 0
        
        # Get last invoice date
        last_invoice_date = None
        if invoices:
            last_invoice = max(invoices, key=lambda x: x["invoice_date"])
            last_invoice_date = datetime.fromisoformat(last_invoice["invoice_date"].replace('Z', '+00:00'))
        
        result.append(ClientProfitability(
            client_id=client["id"],
            client_name=client["name"],
            tier=client["tier"],
            region=client["region"],
            revenue=revenue,
            hours_worked=hours_worked,
            profit=profit,
            margin_percent=margin_percent,
            profit_per_hour=profit_per_hour,
            outstanding_ar=outstanding_ar,
            last_invoice_date=last_invoice_date
        ))
    
    # Sort by revenue descending
    result.sort(key=lambda x: x.revenue, reverse=True)
    return result

@api_router.get("/dashboard/revenue-by-month", response_model=List[RevenueByMonth])
async def get_revenue_by_month(current_user: dict = Depends(get_current_user)):
    # Get paid invoices from the last 12 months
    start_date = datetime.now(timezone.utc) - timedelta(days=365)
    invoices = await db.invoices.find({
        "status": "paid",
        "paid_date": {"$gte": start_date.isoformat()}
    }).to_list(length=None)
    
    # Group by month
    monthly_data = {}
    for invoice in invoices:
        paid_date = datetime.fromisoformat(invoice["paid_date"].replace('Z', '+00:00'))
        month_key = paid_date.strftime("%Y-%m")
        
        if month_key not in monthly_data:
            monthly_data[month_key] = {"revenue": 0, "profit": 0}
        
        monthly_data[month_key]["revenue"] += invoice["amount"]
        monthly_data[month_key]["profit"] += invoice["amount"] * 0.75
    
    # Convert to list and sort
    result = []
    for month, data in sorted(monthly_data.items()):
        result.append(RevenueByMonth(
            month=month,
            revenue=data["revenue"],
            profit=data["profit"]
        ))
    
    return result

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()