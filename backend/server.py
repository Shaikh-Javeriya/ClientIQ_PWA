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
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
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
@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find().to_list(length=None)
    return [Client(**client) for client in clients]

@api_router.post("/clients", response_model=Client)
async def create_client(client_data: Client, current_user: dict = Depends(get_current_user)):
    client_dict = prepare_for_mongo(client_data.dict())
    await db.clients.insert_one(client_dict)
    return client_data

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: Client, current_user: dict = Depends(get_current_user)):
    client_dict = prepare_for_mongo(client_data.dict())
    await db.clients.update_one({"id": client_id}, {"$set": client_dict})
    return client_data

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    # Delete client and associated projects and invoices
    await db.clients.delete_one({"id": client_id})
    await db.projects.delete_many({"client_id": client_id})
    await db.invoices.delete_many({"client_id": client_id})
    return {"message": "Client deleted successfully"}

# CRUD endpoints for invoices
@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find().to_list(length=None)
    parsed_invoices = []
    for invoice in invoices:
        parsed_invoice = parse_from_mongo(invoice)
        parsed_invoices.append(Invoice(**parsed_invoice))
    return parsed_invoices

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: Invoice, current_user: dict = Depends(get_current_user)):
    invoice_dict = prepare_for_mongo(invoice_data.dict())
    await db.invoices.insert_one(invoice_dict)
    return invoice_data

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, invoice_data: Invoice, current_user: dict = Depends(get_current_user)):
    invoice_dict = prepare_for_mongo(invoice_data.dict())
    await db.invoices.update_one({"id": invoice_id}, {"$set": invoice_dict})
    return invoice_data

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    await db.invoices.delete_one({"id": invoice_id})
    return {"message": "Invoice deleted successfully"}

@api_router.put("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, current_user: dict = Depends(get_current_user)):
    await db.invoices.update_one(
        {"id": invoice_id}, 
        {"$set": {
            "status": "paid",
            "paid_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Invoice marked as paid"}

# AR Aging endpoint
@api_router.get("/invoices/ar-aging")
async def get_ar_aging(current_user: dict = Depends(get_current_user)):
    unpaid_invoices = await db.invoices.find({"status": {"$in": ["unpaid", "overdue"]}}).to_list(length=None)
    
    aging_buckets = {
        "0-30": 0,
        "31-60": 0,
        "61-90": 0,
        "90+": 0
    }
    
    current_date = datetime.now(timezone.utc)
    
    for invoice in unpaid_invoices:
        due_date = datetime.fromisoformat(invoice["due_date"].replace('Z', '+00:00'))
        days_overdue = (current_date - due_date).days
        
        if days_overdue <= 30:
            aging_buckets["0-30"] += invoice["amount"]
        elif days_overdue <= 60:
            aging_buckets["31-60"] += invoice["amount"]
        elif days_overdue <= 90:
            aging_buckets["61-90"] += invoice["amount"]
        else:
            aging_buckets["90+"] += invoice["amount"]
    
    return aging_buckets

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