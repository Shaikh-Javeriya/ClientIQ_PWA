import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
    Database,
    Activity,
    Users,
    Clock,
    DollarSign,
    RefreshCw,
    Search,
    ExternalLink
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/use-toast";
import { useCurrency } from "./CurrencyContext";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Helper - compute R/F/M for each client using invoices data
 * Recency = days since last invoice (lower = better) -> we'll invert when scoring
 * Frequency = number of invoices (higher is better)
 * Monetary = total billed/paid amount (higher is better)
 *
 * We'll compute numeric values then map to 1-5 scores by quintiles.
 */
function computeRFM(clients = [], invoices = []) {
    const now = new Date();
    // group invoices by client_id
    const byClient = {};
    invoices.forEach(inv => {
        const cid = inv.client_id || inv.clientId || inv.client;
        if (!cid) return;
        if (!byClient[cid]) byClient[cid] = [];
        byClient[cid].push(inv);
    });

    const rows = clients.map(client => {
        const id = client.id || client.client_id;
        const invs = byClient[id] || [];

        // recency: days since last invoice (if none, large value)
        const lastDate = invs.reduce((acc, cur) => {
            const d = cur.invoice_date || cur.date || cur.created_at || cur.date_created;
            if (!d) return acc;
            const dt = new Date(d);
            if (!acc) return dt;
            return dt > acc ? dt : acc;
        }, null);

        const recencyDays = lastDate ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) : 9999;

        // frequency: number of invoices (we could also use completed projects)
        const frequency = invs.length;

        // monetary: sum of invoice amounts
        const monetary = invs.reduce((s, cur) => s + (parseFloat(cur.amount || cur.total || 0) || 0), 0);

        return {
            id,
            name: client.name || client.client_name || client.display_name || "Unnamed",
            recencyDays,
            frequency,
            monetary,
            lastDate,
            raw: client
        };
    });

    // compute quantiles for recency (note: recency lower = better)
    const recencies = rows.map(r => r.recencyDays).sort((a, b) => a - b);
    const freqs = rows.map(r => r.frequency).sort((a, b) => a - b);
    const monies = rows.map(r => r.monetary).sort((a, b) => a - b);

    function quintileScore(value, sortedArray, invert = false) {
        if (!sortedArray.length) return 1;
        const n = sortedArray.length;
        // find rank position (0..n-1)
        const pos = sortedArray.findIndex(v => v >= value);
        // if not found (value greater than all), pos = n-1
        const idx = pos === -1 ? n - 1 : pos;
        // percentile
        const p = idx / (n - 1 || 1);
        // map to 1..5
        let score = Math.ceil((p * 5));
        if (score < 1) score = 1;
        if (score > 5) score = 5;
        if (invert) {
            // invert so that lower value => higher score
            score = 6 - score;
            if (score < 1) score = 1;
            if (score > 5) score = 5;
        }
        return score;
    }

    const enriched = rows.map(r => {
        const R = quintileScore(r.recencyDays, recencies, true); // invert
        const F = quintileScore(r.frequency, freqs, false);
        const M = quintileScore(r.monetary, monies, false);
        const rfmString = `${R}${F}${M}`;
        const rfmScore = R + F + M; // 3..15
        // segment heuristics (simplified)
        let segment = "Other";
        if (R >= 4 && F >= 4 && M >= 4) segment = "Champion";
        else if (F >= 4 && M >= 4) segment = "Loyal";
        else if (R >= 4 && F >= 2) segment = "Potential";
        else if (R <= 2 && (F >= 3 || M >= 3)) segment = "At Risk";
        else if (R <= 2 && F <= 2 && M <= 2) segment = "Lost";

        return {
            ...r,
            R, F, M,
            rfmString,
            rfmScore,
            segment
        };
    });

    return enriched;
}

const RFMAnalysisPage = () => {
    //const [clients, setClients] = useState([]);
    //const [invoices, setInvoices] = useState([]);
    const [rfmRows, setRfmRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ segment: "all", q: "" });
    const { toast } = useToast();
    const { formatCurrency } = useCurrency();
    const navigate = useNavigate();


    const fetchAll = async () => {
        try {
            setLoading(true);
            // Fetch precomputed RFM data from backend
            const token = localStorage.getItem("token");
            const rfmResp = await axios.get(`${API}/dashboard/rfm`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRfmRows(rfmResp.data || []);
        } catch (err) {
            console.error("RFM fetch error:", err);
            toast({
                title: "Error",
                description: "Failed to fetch RFM data from server",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line
    }, []);

    //useEffect(() => {
    //  if (!clients.length) {
    //      setRfmRows([]);
    //       return;
    //   }
    //    const computed = computeRFM(clients, invoices);
    //    setRfmRows(computed);
    //}, [clients, invoices]);

    const filteredRows = useMemo(() => {
        let rows = [...rfmRows];
        if (filter.segment && filter.segment !== "all") {
            rows = rows.filter(r => r.segment.toLowerCase() === filter.segment.toLowerCase());
        }
        if (filter.q) {
            rows = rows.filter(r => r.name.toLowerCase().includes(filter.q.toLowerCase()) || r.id?.toLowerCase().includes(filter.q.toLowerCase()));
        }
        return rows.sort((a, b) => b.rfmScore - a.rfmScore || b.monetary - a.monetary);
    }, [rfmRows, filter]);

    const avgRecency = useMemo(() => {
        if (!rfmRows.length) return 0;
        const s = rfmRows.reduce((a, b) => a + b.recencyDays, 0) / rfmRows.length;
        return Math.round(s);
    }, [rfmRows]);

    const avgFreq = useMemo(() => {
        if (!rfmRows.length) return 0;
        const s = rfmRows.reduce((a, b) => a + b.frequency, 0) / rfmRows.length;
        return +(s.toFixed(1));
    }, [rfmRows]);

    const avgMonetary = useMemo(() => {
        if (!rfmRows.length) return 0;
        const s = rfmRows.reduce((a, b) => a + b.monetary, 0) / rfmRows.length;
        return +(s.toFixed(2));
    }, [rfmRows]);

    const segmentCounts = useMemo(() => {
        const map = {};
        rfmRows.forEach(r => {
            map[r.segment] = map[r.segment] ? map[r.segment] + 1 : 1;
        });
        return map;
    }, [rfmRows]);

    // Scatter / bubble chart helpers
    const scatterDims = { width: 780, height: 360, padding: 40 };

    const scatterData = filteredRows.slice(0, 200); // limit for performance

    const freqMax = Math.max(...scatterData.map(d => d.frequency), 1);
    const recencyMax = Math.max(...scatterData.map(d => d.recencyDays), 1);
    const moneyMax = Math.max(...scatterData.map(d => d.monetary), 1);

    function xScale(freq) {
        const w = scatterDims.width - scatterDims.padding * 2;
        return scatterDims.padding + (freq / freqMax) * w;
    }
    function yScale(recency) {
        // smaller recency = better; invert for plotting (so better on top)
        const h = scatterDims.height - scatterDims.padding * 2;
        const val = 1 - Math.min(recency / recencyMax, 1);
        return scatterDims.padding + val * h;
    }
    function rScale(money) {
        const minR = 5;
        const maxR = 28;
        return minR + (money / moneyMax) * (maxR - minR);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">RFM Insights</h1>
                    <p className="text-gray-600">Segment clients by Recency, Frequency & Monetary value to prioritize growth actions.</p>
                </div>

                <div className="flex items-center space-x-2">
                    <Button onClick={fetchAll} size="sm" variant="outline" title="Refresh RFM data">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => navigate("/clients")} size="sm" className="btn-primary">
                        View Clients
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="kpi-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Avg Recency</p>
                                <p className="text-2xl font-bold text-gray-900">{avgRecency} days</p>
                            </div>
                            <div className="p-2 rounded-full bg-blue-50">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="kpi-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Avg Frequency</p>
                                <p className="text-2xl font-bold text-gray-900">{avgFreq}</p>
                            </div>
                            <div className="p-2 rounded-full bg-green-50">
                                <Activity className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="kpi-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Avg Monetary</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgMonetary)}</p>
                            </div>
                            <div className="p-2 rounded-full bg-purple-50">
                                <DollarSign className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="kpi-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Active Clients</p>
                                <p className="text-2xl font-bold text-gray-900">{rfmRows.length}</p>
                            </div>
                            <div className="p-2 rounded-full bg-indigo-50">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main chart + Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scatter / Bubble */}
                <Card className="col-span-2 chart-container">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Database className="w-5 h-5" />
                            <span>R vs F (bubble = monetary)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Input
                                    placeholder="Search client..."
                                    value={filter.q}
                                    onChange={(e) => setFilter(f => ({ ...f, q: e.target.value }))}
                                    className="pl-9 w-64"
                                />
                                <Search className="absolute ml-3 w-4 h-4 text-gray-400" />
                            </div>

                            <div className="flex items-center space-x-2">
                                <select
                                    value={filter.segment}
                                    onChange={(e) => setFilter(f => ({ ...f, segment: e.target.value }))}
                                    className="rounded-lg border px-3 py-1 text-sm"
                                >
                                    <option value="all">All Segments</option>
                                    <option value="Champion">Champions</option>
                                    <option value="Champion">Champion</option>
                                    <option value="Loyal">Loyal</option>
                                    <option value="Potential">Potential</option>
                                    <option value="At Risk">At Risk</option>
                                    <option value="Lost">Lost</option>
                                </select>
                            </div>
                        </div>

                        {/* Simple SVG scatter */}
                        <div className="overflow-x-auto">
                            <svg width="100%" viewBox={`0 0 ${scatterDims.width} ${scatterDims.height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-72">
                                {/* axes lines */}
                                <line x1={scatterDims.padding} y1={scatterDims.height - scatterDims.padding} x2={scatterDims.width - scatterDims.padding} y2={scatterDims.height - scatterDims.padding} stroke="#e5e7eb" />
                                <line x1={scatterDims.padding} y1={scatterDims.padding} x2={scatterDims.padding} y2={scatterDims.height - scatterDims.padding} stroke="#e5e7eb" />

                                {/* labels */}
                                <text x={scatterDims.width / 2} y={scatterDims.height - 6} textAnchor="middle" className="text-xs" fill="#6b7280">Frequency (count)</text>
                                <text x={12} y={scatterDims.height / 2} transform={`rotate(-90 12 ${scatterDims.height / 2})`} textAnchor="middle" className="text-xs" fill="#6b7280">Recency (better ↑)</text>

                                {/* bubbles */}
                                {scatterData.map(d => {
                                    const cx = xScale(d.frequency);
                                    const cy = yScale(d.recencyDays);
                                    const r = rScale(d.monetary);
                                    const color = d.segment === "Champion" ? "#065f46" :
                                        d.segment === "Loyal" ? "#1e40af" :
                                            d.segment === "Potential" ? "#b45309" :
                                                d.segment === "At Risk" ? "#b91c1c" :
                                                    "#374151";
                                    return (
                                        <g key={d.id}>
                                            <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.9" />
                                            <title>{`${d.name} — R:${d.R} F:${d.F} M:${d.M} — ${formatCurrency(d.monetary)} — last ${d.recencyDays}d`}</title>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>

                        <div className="mt-3 text-sm text-gray-500">
                            <strong>Tip:</strong> Hover a bubble (or view the table) to see client-level RFM. Bigger bubbles = more revenue.
                        </div>
                    </CardContent>
                </Card>

                {/* Segment Cards */}
                <div className="space-y-4">
                    {["Champion", "Loyal", "Potential", "At Risk", "Lost"].map(seg => (
                        <Card key={seg} className="p-3">
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-600">{seg}</p>
                                        <p className="text-lg font-semibold">{segmentCounts[seg] || 0} clients</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {rfmRows.length ? `${Math.round(((segmentCounts[seg] || 0) / rfmRows.length) * 100)}% of clients` : ""}
                                        </p>
                                    </div>
                                    <div>
                                        <Button size="sm" variant="ghost" onClick={() => setFilter(f => ({ ...f, segment: seg }))}>
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Detailed table */}
            <Card className="chart-container">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>Clients — RFM Table ({filteredRows.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-sm">
                            <thead>
                                <tr className="text-left text-gray-600">
                                    <th className="py-2">Client</th>
                                    <th className="py-2">R</th>
                                    <th className="py-2">F</th>
                                    <th className="py-2">M</th>
                                    <th className="py-2">RFM</th>
                                    <th className="py-2">Segment</th>
                                    <th className="py-2">Revenue</th>
                                    <th className="py-2">Last Project</th>
                                    <th className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map(row => (
                                    <tr key={row.id} className="border-t">
                                        <td className="py-2">
                                            <div className="font-medium">{row.name}</div>
                                            <div className="text-xs text-gray-500">{row.id}</div>
                                        </td>
                                        <td className="py-2">{row.R}</td>
                                        <td className="py-2">{row.F}</td>
                                        <td className="py-2">{row.M}</td>
                                        <td className="py-2">{row.rfmString}</td>
                                        <td className="py-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${row.segment === 'Champion' ? 'bg-green-50 text-green-700' : row.segment === 'At Risk' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                                                {row.segment}
                                            </span>
                                        </td>
                                        <td className="py-2">{formatCurrency(row.monetary)}</td>
                                        <td className="py-2">{row.lastDate ? new Date(row.lastDate).toLocaleDateString() : "—"}</td>
                                        <td className="py-2">
                                            <div className="flex items-center space-x-2">
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/client-details?id=${row.id}`)} title="Open client details">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`Hi ${row.name},\n\nI wanted to check if you'd be interested in our new service...`)} title="Copy outreach template">
                                                    ✉️
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {filteredRows.length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="py-4 text-center text-gray-500">No clients match this filter.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RFMAnalysisPage;