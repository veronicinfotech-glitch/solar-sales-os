from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle
)

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from fastapi.responses import FileResponse
import random
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from datetime import datetime, timedelta

from database import engine, SessionLocal
from models import Base, Lead

from reportlab.graphics.shapes import Drawing, Rect, Circle, Line, Polygon, String
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.barcode import qr
from sqlalchemy import text, inspect

# ✅ Create FastAPI app
app = FastAPI()

# ✅ Enable CORS (for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Create DB tables
Base.metadata.create_all(bind=engine)


def ensure_lead_columns():
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("leads")}

    with engine.begin() as connection:
        if "next_call_date" not in columns:
            connection.execute(text("ALTER TABLE leads ADD COLUMN next_call_date DATE"))


ensure_lead_columns()

# ============================
# 📥 INPUT MODEL
# ============================
class InputData(BaseModel):
    bill: float


# ============================
# 🏠 HOME ROUTE
# ============================
@app.get("/")
def home():
    return {"message": "Solar OS Running"}


# ============================
# ⚡ CALCULATE PROPOSAL
# ============================
@app.post("/calculate")
def calculate(data: InputData):
    units = data.bill / 7
    system_size = units / 120
    cost = system_size * 50000
    annual_savings = units * 12 * 7
    payback = cost / annual_savings

    return {
        "system_size": round(system_size, 2),
        "cost": round(cost),
        "annual_savings": round(annual_savings),
        "payback_years": round(payback, 1)
    }


# ============================
# 💾 SAVE LEAD
# ============================
@app.post("/save-lead")
def save_lead(data: dict):
    db = SessionLocal()

    bill = data.get("bill")

    # ✅ FIX: ensure bill is number
    try:
        bill = float(bill)
    except:
        bill = 0

    # 🔥 Lead scoring
    if bill > 5000:
        status = "hot"
    elif bill > 2000:
        status = "warm"
    else:
        status = "cold"

    new_lead = Lead(
        name=data.get("name"),
        phone=data.get("phone"),
        bill=bill,
        system_size=data.get("system_size"),
        annual_savings=data.get("annual_savings"),
        status=status,
        next_call_date=datetime.utcnow().date()
    )

    db.add(new_lead)
    db.commit()
    db.close()

    return {"message": "Lead saved"}
# ============================
# 📋 GET ALL LEADS
# ============================
@app.get("/leads")
def get_leads():
    db = SessionLocal()
    leads = db.query(Lead).order_by(Lead.created_at.desc()).all()
    db.close()

    result = []

    for lead in leads:
        result.append({
            "id": lead.id,
            "name": lead.name,
            "phone": lead.phone,
            "notes": lead.notes,
            "bill": lead.bill,
            "system_size": lead.system_size,
            "annual_savings": lead.annual_savings,
            "survey_date": lead.survey_date,
            "survey_status": lead.survey_status,
            "next_followup_date": lead.next_followup_date.isoformat()
                if lead.next_followup_date
                else None,
            "status": lead.status,
	        "follow_up_count": lead.follow_up_count,
            "next_call_date": lead.next_call_date.isoformat() if lead.next_call_date else None,
            "created_at": lead.created_at.isoformat()
                if lead.created_at
                else None
        })

    return result



@app.put("/update-status/{lead_id}")
def update_status(lead_id: int, status: str):
    db = SessionLocal()

    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if lead:
        lead.status = status
        if status in ("closed", "lost"):
            lead.next_call_date = None
        db.commit()

    db.close()

    return {"message": "Status updated"}





@app.put("/update-lead/{lead_id}")
def update_lead(lead_id: int, data: dict):
    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        db.close()
        return {"message": "Lead not found"}

    lead.name = data.get("name", lead.name)
    lead.phone = data.get("phone", lead.phone)

    try:
        lead.bill = float(
            data.get("bill", lead.bill)
        )
    except:
        pass

    db.commit()
    db.close()

    return {"message": "Lead updated"}


@app.put("/update-notes/{lead_id}")
def update_notes(lead_id: int, data: dict):
    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        db.close()
        return {"message": "Lead not found"}

    lead.notes = data.get("notes", "")
    db.commit()
    db.close()

    return {"message": "Notes updated"}


@app.put("/schedule-survey/{lead_id}")
def schedule_survey(lead_id: int, data: dict):
    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        db.close()
        return {"message": "Lead not found"}

    survey_date = data.get("survey_date")

    try:
        lead.survey_date = datetime.fromisoformat(survey_date).date() if survey_date else None
    except Exception:
        db.close()
        return {"message": "Invalid survey date"}

    lead.survey_status = "scheduled"
    db.commit()
    db.close()

    return {"message": "Survey scheduled"}


@app.get("/survey-reminders")
def survey_reminders():
    db = SessionLocal()
    leads = db.query(Lead).all()
    today = datetime.utcnow().date()

    today_surveys = []
    tomorrow_surveys = []
    overdue_surveys = []

    for lead in leads:
        if not lead.survey_date:
            continue

        data = {
            "id": lead.id,
            "name": lead.name,
            "phone": lead.phone,
            "status": lead.status,
            "survey_date": lead.survey_date.isoformat(),
            "survey_status": lead.survey_status,
        }

        if lead.survey_date < today:
            overdue_surveys.append(data)
        elif lead.survey_date == today:
            today_surveys.append(data)
        elif lead.survey_date == (today + timedelta(days=1)):
            tomorrow_surveys.append(data)

    db.close()
    return {
        "today": today_surveys,
        "tomorrow": tomorrow_surveys,
        "overdue": overdue_surveys,
    }




@app.get("/follow-ups")
def get_followups():
    db = SessionLocal()
    leads = db.query(Lead).filter(
        Lead.follow_up_count < 3,
        Lead.status != "lost",
        Lead.status != "closed"
    ).all()

    result = []

    for lead in leads:
        result.append({
            "id": lead.id,
            "name": lead.name,
            "phone": lead.phone,
            "status": lead.status,
            "follow_up_count": lead.follow_up_count,
            "last_contacted": lead.last_contacted.isoformat() if lead.last_contacted else None,
            "next_followup_date": lead.next_followup_date.isoformat() if lead.next_followup_date else None,
        })

    db.close()
    return result











@app.delete("/delete-lead/{lead_id}")
def delete_lead(lead_id: int):
    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if lead:
        db.delete(lead)
        db.commit()

    db.close()

    return {"message": "Lead deleted"}







@app.post("/send-followup/{lead_id}")
def send_followup(lead_id: int):
    db = SessionLocal()

    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if lead:
        if lead.follow_up_count == 0:
            lead.next_followup_date = datetime.utcnow() + timedelta(days=3)
            lead.next_call_date = (datetime.utcnow() + timedelta(days=3)).date()
        elif lead.follow_up_count == 1:
            lead.next_followup_date = datetime.utcnow() + timedelta(days=5)
            lead.next_call_date = (datetime.utcnow() + timedelta(days=5)).date()
        elif lead.follow_up_count == 2:
            lead.next_followup_date = datetime.utcnow() + timedelta(days=7)
            lead.next_call_date = (datetime.utcnow() + timedelta(days=7)).date()
        elif lead.follow_up_count >= 3:
            lead.next_followup_date = None
            lead.next_call_date = None

        lead.follow_up_count += 1
        lead.last_contacted = datetime.utcnow()
        db.commit()

    db.close()

    return {"message": "Follow-up sent"}


@app.get("/dashboard-stats")
def dashboard_stats():
    db = SessionLocal()
    leads = db.query(Lead).all()
    today = datetime.utcnow().date()

    def count_status(status):
        return len([lead for lead in leads if lead.status == status])

    today_calls = len([
        lead for lead in leads
        if lead.next_call_date == today and lead.status not in ("lost", "closed")
    ])
    overdue_calls = len([
        lead for lead in leads
        if lead.next_call_date and lead.next_call_date < today and lead.status not in ("lost", "closed")
    ])
    today_surveys = len([
        lead for lead in leads
        if lead.survey_date == today
    ])

    revenue_potential = sum(
        (lead.system_size or 0) * 50000
        for lead in leads
        if lead.status not in ("closed", "lost")
    )

    db.close()

    return {
        "total_leads": len(leads),
        "new": count_status("new"),
        "contacted": count_status("contacted"),
        "hot": count_status("hot"),
        "warm": count_status("warm"),
        "closed": count_status("closed"),
        "lost": count_status("lost"),
        "today_calls": today_calls,
        "overdue_calls": overdue_calls,
        "today_surveys": today_surveys,
        "revenue_potential": revenue_potential,
    }


@app.get("/followup-message/{lead_id}")
def followup_message(lead_id: int):
    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        db.close()
        return {"error": "Lead not found"}

    count = lead.follow_up_count

    if count == 0:
        message = f"""Hello {lead.name},
Your solar proposal is ready.
⚡ System Size: {lead.system_size} kW
💰 Annual Savings: ₹{lead.annual_savings}

Please review it and let us know your thoughts.
Regards,
Veronic Solar"""
    elif count == 1:
        message = f"""Hello {lead.name},
Just following up regarding your solar proposal.
If you have any questions about cost, subsidy, installation or savings, we would be happy to help.
Regards,
Veronic Solar"""
    elif count == 2:
        message = f"""Hello {lead.name},
This is our final follow-up regarding your solar proposal.
Solar savings and subsidy benefits are currently available.
Let us know if you'd like to proceed.
Regards,
Veronic Solar"""
    else:
        message = "Completed"

    phone = lead.phone

    db.close()

    return {
        "phone": phone,
        "message": message,
        "follow_up_count": count
    }


@app.get("/followup-reminders")
def followup_reminders():
    db = SessionLocal()
    leads = db.query(Lead).all()
    today = datetime.utcnow().date()

    today_calls = []
    tomorrow_calls = []
    overdue_calls = []
    completed_calls = []

    for lead in leads:
        data = {
            "id": lead.id,
            "name": lead.name,
            "phone": lead.phone,
            "status": lead.status,
            "follow_up_count": lead.follow_up_count,
        }

        if lead.follow_up_count >= 3 or lead.status in ("lost", "closed"):
            completed_calls.append(data)
            continue

        if not lead.next_call_date:
            continue

        followup_date = lead.next_call_date

        if followup_date < today:
            overdue_calls.append(data)
        elif followup_date == today:
            today_calls.append(data)
        elif followup_date == (today + timedelta(days=1)):
            tomorrow_calls.append(data)

    db.close()
    return {
        "today": today_calls,
        "tomorrow": tomorrow_calls,
        "overdue": overdue_calls,
        "completed": completed_calls,
    }

@app.get("/generate-proposal/{lead_id}")
def generate_proposal(lead_id: int):

    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        db.close()
        return {"message": "Lead not found"}

    pdf_file = f"proposal_{lead.id}.pdf"

    doc = SimpleDocTemplate(
        pdf_file,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    styles = getSampleStyleSheet()

    story = []

    # Safe values
    system_size = lead.system_size or 0
    annual_savings = lead.annual_savings or 0
    bill = lead.bill or 0

    project_cost = system_size * 50000
    government_subsidy = project_cost * 0.20 if project_cost else 0
    net_investment = max(project_cost - government_subsidy, 0)
    annual_generation = system_size * 1400
    annual_bill = bill * 12
    lifetime_cost = annual_bill * 25
    savings_percentage = ((annual_savings / annual_bill) * 100) if annual_bill > 0 else 0
    carbon_offset = round(system_size * 1.5)
    equivalent_cars_removed = round(system_size * 0.25)
    environmental_score = min(100, round(system_size * 8 + 40))
    panel_quantity = max(1, round(system_size * 2))
    panel_capacity = round(system_size * 1000 / panel_quantity) if panel_quantity else 0
    inverter_rating = f"{system_size:.2f} kW String Inverter"
    roof_area = round(system_size * 75)
    estimated_generation = round(annual_generation)
    warranty_text = "25 Years Performance / 10 Years Product"

    payback = (
        net_investment / annual_savings
        if annual_savings > 0
        else 0
    )

    savings_25_years = annual_savings * 25

    if project_cost > 0:
        roi = (
            (
                savings_25_years
                - project_cost
            )
            / project_cost
        ) * 100
    else:
        roi = 0

    proposal_number = (
        f"VS-{random.randint(1000,9999)}"
    )

    def money(value):
        return f"Rs. {value:,.0f}"

    def section_title(text):
        return Paragraph(text, styles["Heading1"])

    def subtitle(text):
        return Paragraph(text, styles["Heading2"])

    def card_table(rows, header_fill=colors.HexColor("#0B1F3A"), label_fill=colors.HexColor("#F4F7FB")):
        table = Table(rows, colWidths=[70 * mm, 95 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), header_fill),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BACKGROUND", (0, 1), (0, -1), label_fill),
            ("GRID", (0, 0), (-1, -1), 0.8, colors.HexColor("#D6DCE5")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 11),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
        ]))
        return table

    def kpi_card(title, value, accent="#FFD24A"):
        table = Table([[Paragraph(title, styles["BodyText"]), Paragraph(value, styles["Title"])]], colWidths=[60 * mm, 45 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 1.2, colors.HexColor("#DDE5F0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        return table

    def premium_cover(width=170 * mm, height=230 * mm):
        d = Drawing(width, height)
        d.add(Rect(0, 0, width, height, fillColor=colors.HexColor("#081A33"), strokeColor=None))
        d.add(Rect(0, height * 0.74, width, height * 0.26, fillColor=colors.HexColor("#0E2B55"), strokeColor=None))
        d.add(Rect(0, 0, width, 26 * mm, fillColor=colors.HexColor("#0A2748"), strokeColor=None))
        for x in range(12, int(width), 30):
            d.add(Line(x, 20, x + 120, 60, strokeColor=colors.HexColor("#173A67"), strokeWidth=0.7))
        d.add(Circle(width * 0.82, height * 0.8, 18 * mm, fillColor=colors.HexColor("#FFD24A"), strokeColor=None))
        for angle in range(0, 360, 24):
            dx = 32 * mm * (1 if angle % 48 == 0 else 0.72)
            d.add(Line(width * 0.82, height * 0.8, width * 0.82 + dx, height * 0.8 + (dx / 3 if angle < 180 else -dx / 3), strokeColor=colors.HexColor("#FFD24A"), strokeWidth=1.5))
        d.add(Line(24 * mm, 56 * mm, 58 * mm, 81 * mm, strokeColor=colors.white, strokeWidth=3))
        d.add(Line(58 * mm, 81 * mm, 95 * mm, 56 * mm, strokeColor=colors.white, strokeWidth=3))
        d.add(Line(24 * mm, 56 * mm, 95 * mm, 56 * mm, strokeColor=colors.white, strokeWidth=3))
        for i in range(4):
            d.add(Rect(31 * mm + i * 13 * mm, 63 * mm, 11 * mm, 7 * mm, fillColor=colors.HexColor("#173A67"), strokeColor=colors.HexColor("#9CC4FF"), strokeWidth=0.6))
        d.add(Rect(88 * mm, 56 * mm, 18 * mm, 25 * mm, fillColor=colors.HexColor("#F4F7FB"), strokeColor=colors.HexColor("#C7D0DD"), strokeWidth=0.8))
        d.add(Line(86 * mm, 81 * mm, 97 * mm, 92 * mm, strokeColor=colors.HexColor("#C7D0DD"), strokeWidth=0.8))
        d.add(Line(97 * mm, 92 * mm, 108 * mm, 81 * mm, strokeColor=colors.HexColor("#C7D0DD"), strokeWidth=0.8))
        d.add(Line(86 * mm, 81 * mm, 108 * mm, 81 * mm, strokeColor=colors.HexColor("#C7D0DD"), strokeWidth=0.8))
        for x in [40 * mm, 54 * mm, 68 * mm]:
            d.add(Circle(x, 41 * mm, 3 * mm, fillColor=colors.HexColor("#FFD24A"), strokeColor=None))
        d.add(String(18 * mm, 140 * mm, "SMART SOLAR ENERGY PROPOSAL", fontName="Helvetica-Bold", fontSize=22, fillColor=colors.white))
        d.add(String(18 * mm, 128 * mm, "Personalized Solar Solution for Long-Term Savings and Energy Independence", fontName="Helvetica", fontSize=9.5, fillColor=colors.HexColor("#D8E4F2")))
        d.add(String(18 * mm, 104 * mm, "VERONIC SOLAR", fontName="Helvetica-Bold", fontSize=16, fillColor=colors.HexColor("#FFD24A")))
        return d

    def dashboard_chart(values, labels, title, kind="bar"):
        drawing = Drawing(170 * mm, 65 * mm)
        drawing.add(Rect(0, 0, 170 * mm, 65 * mm, fillColor=colors.white, strokeColor=colors.HexColor("#D6DCE5"), strokeWidth=0.8))
        drawing.add(String(8, 56 * mm, title, fontName="Helvetica-Bold", fontSize=12, fillColor=colors.HexColor("#0B1F3A")))
        if kind == "bar":
            chart = VerticalBarChart()
            chart.x = 14 * mm
            chart.y = 10 * mm
            chart.height = 35 * mm
            chart.width = 140 * mm
            chart.data = [values]
            chart.categoryAxis.categoryNames = labels
            chart.valueAxis.valueMin = 0
            chart.valueAxis.valueMax = max(values) * 1.25 if values else 1
            chart.valueAxis.valueStep = max(1, round(max(values) / 5)) if values else 1
            chart.bars[0].fillColor = colors.HexColor("#FFD24A")
            drawing.add(chart)
        else:
            chart = HorizontalLineChart()
            chart.x = 14 * mm
            chart.y = 10 * mm
            chart.height = 35 * mm
            chart.width = 140 * mm
            chart.data = [values]
            chart.categoryAxis.categoryNames = labels
            chart.valueAxis.valueMin = 0
            chart.valueAxis.valueMax = max(values) * 1.25 if values else 1
            chart.lines[0].strokeColor = colors.HexColor("#0E2B55")
            drawing.add(chart)
        return drawing

    def savings_curve(years=25):
        drawing = Drawing(170 * mm, 70 * mm)
        drawing.add(Rect(0, 0, 170 * mm, 70 * mm, fillColor=colors.white, strokeColor=colors.HexColor("#D6DCE5"), strokeWidth=0.8))
        drawing.add(String(8, 61 * mm, "Savings Growth Line Chart", fontName="Helvetica-Bold", fontSize=12, fillColor=colors.HexColor("#0B1F3A")))
        chart = HorizontalLineChart()
        chart.x = 16 * mm
        chart.y = 12 * mm
        chart.height = 42 * mm
        chart.width = 140 * mm
        cumulative = []
        total = 0
        for _ in range(years):
            total += annual_savings
            cumulative.append(total)
        chart.data = [cumulative]
        chart.categoryAxis.categoryNames = [str(i) for i in range(1, years + 1)]
        chart.valueAxis.valueMin = 0
        chart.valueAxis.valueMax = cumulative[-1] * 1.08 if cumulative else 1
        chart.lines[0].strokeColor = colors.HexColor("#FFD24A")
        chart.lines[0].strokeWidth = 2
        drawing.add(chart)
        return drawing

    def qr_block(text):
        widget = qr.QrCodeWidget(text)
        widget.barWidth = 1.2 * mm
        widget.barHeight = 1.2 * mm
        widget.x = 0
        widget.y = 0
        drawing = Drawing(36 * mm, 36 * mm)
        drawing.add(Rect(0, 0, 36 * mm, 36 * mm, fillColor=colors.white, strokeColor=colors.HexColor("#D6DCE5"), strokeWidth=0.8))
        drawing.add(widget)
        return drawing

    def timeline_card(step_number, title, details, accent, step_color):
        inner = Table([
            [Paragraph(f"<b>{step_number}</b>", ParagraphStyle("StepNo", parent=styles["Title"], textColor=colors.white, alignment=TA_CENTER, fontSize=16)), Paragraph(f"<b>{title}</b>", ParagraphStyle("StepTitle", parent=styles["Heading3"], textColor=colors.HexColor("#0B1F3A"), fontSize=11.5))],
            ["", Paragraph(details, ParagraphStyle("StepBody", parent=styles["BodyText"], textColor=colors.HexColor("#415067"), fontSize=9.5, leading=12))],
        ], colWidths=[14 * mm, 48 * mm])
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), step_color),
            ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#F4F7FB")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("SPAN", (0, 1), (0, 1)),
            ("GRID", (0, 0), (-1, -1), 0.8, colors.HexColor("#D8E0EA")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return inner

    def emi_card(plan_name, emi, down_payment, interest, total_cost, featured=False):
        accent = colors.HexColor("#FFD24A") if featured else colors.HexColor("#0B1F3A")
        header_bg = colors.HexColor("#0B1F3A") if featured else colors.HexColor("#F4F7FB")
        header_fg = colors.white if featured else colors.HexColor("#0B1F3A")
        badge_text = "MOST POPULAR" if featured else ""
        rows = [
            [Paragraph(plan_name, ParagraphStyle("PlanName", parent=styles["Heading2"], alignment=TA_CENTER, textColor=header_fg, fontSize=13))],
            [Paragraph(badge_text, ParagraphStyle("Badge", parent=styles["BodyText"], alignment=TA_CENTER, textColor=accent, fontSize=8.5)) if badge_text else ""],
            [Paragraph(f"<b>{money(emi)}</b>", ParagraphStyle("EMIValue", parent=styles["Title"], alignment=TA_CENTER, textColor=colors.HexColor("#0B1F3A"), fontSize=16))],
            [Paragraph(f"Down Payment: {money(down_payment)}", ParagraphStyle("CardText", parent=styles["BodyText"], alignment=TA_CENTER, fontSize=9.5, textColor=colors.HexColor("#415067")))],
            [Paragraph(f"Interest: {interest}", ParagraphStyle("CardText", parent=styles["BodyText"], alignment=TA_CENTER, fontSize=9.5, textColor=colors.HexColor("#415067")))],
            [Paragraph(f"Total Cost: {money(total_cost)}", ParagraphStyle("CardText", parent=styles["BodyText"], alignment=TA_CENTER, fontSize=9.5, textColor=colors.HexColor("#415067")))],
        ]
        card = Table(rows, colWidths=[78 * mm])
        card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("BACKGROUND", (0, 2), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 1.2, accent),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8E0EA")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        return card

    story.append(premium_cover())
    story.append(PageBreak())

    # Page 2: dashboard
    story.append(section_title("EXECUTIVE SUMMARY DASHBOARD"))
    story.append(Spacer(1, 6))
    story.append(kpi_card("Monthly Electricity Bill", money(bill)))
    story.append(Spacer(1, 4))
    story.append(kpi_card("Recommended System Size", f"{system_size:.2f} kW"))
    story.append(Spacer(1, 4))
    story.append(kpi_card("Annual Energy Generation", f"{estimated_generation:,.0f} kWh"))
    story.append(Spacer(1, 4))
    story.append(kpi_card("Annual Savings", money(annual_savings)))
    story.append(Spacer(1, 4))
    story.append(kpi_card("Total Project Cost", money(project_cost)))
    story.append(Spacer(1, 4))
    story.append(kpi_card("Payback Period", f"{payback:.1f} Years"))
    story.append(Spacer(1, 8))
    story.append(subtitle("At A Glance"))
    story.append(card_table([
        ["Metric", "Value"],
        ["ROI Percentage", f"{roi:.0f}%"],
        ["25-Year Savings", money(savings_25_years)],
        ["Carbon Offset", f"{carbon_offset} Tons / Year"],
    ]))
    story.append(PageBreak())

    # Page 3: why solar
    story.append(section_title("WHY GO SOLAR"))
    benefit_rows = [
        ["Lower Electricity Bills", "Energy Independence", "Protection Against Tariff Increases"],
        ["Environment Friendly", "Increased Property Value", "Long System Life"],
    ]
    for row in benefit_rows:
        story.append(Table([[Paragraph(text, styles["Heading3"]) for text in row]], colWidths=[55 * mm, 55 * mm, 55 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#D6DCE5")),
            ("GRID", (0, 0), (-1, -1), 0.8, colors.HexColor("#E7ECF3")),
            ("TOPPADDING", (0, 0), (-1, -1), 14),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ])))
        story.append(Spacer(1, 6))
    story.append(PageBreak())

    # Page 4: customer energy analysis
    story.append(section_title("CUSTOMER ENERGY ANALYSIS"))
    story.append(card_table([
        ["Current Situation", "Value"],
        ["Monthly Bill", money(bill)],
        ["Annual Bill", money(annual_bill)],
        ["Lifetime Electricity Cost", money(lifetime_cost)],
    ]))
    story.append(Spacer(1, 8))
    story.append(card_table([
        ["Future Situation With Solar", "Value"],
        ["Reduced Electricity Cost", money(max(annual_bill - annual_savings, 0))],
        ["Savings Percentage", f"{savings_percentage:.0f}%"],
        ["Expected Solar Production", f"{estimated_generation:,.0f} kWh / Year"],
    ]))
    story.append(Spacer(1, 8))
    story.append(dashboard_chart([bill, max(annual_bill - annual_savings, 0)], ["Current", "With Solar"], "Energy Consumption Comparison", kind="bar"))
    story.append(Spacer(1, 8))
    story.append(dashboard_chart([annual_bill, max(annual_bill - annual_savings, 0)], ["Current", "With Solar"], "Cost Reduction Visualization", kind="bar"))
    story.append(PageBreak())

    # Page 5: system design
    story.append(section_title("SOLAR SYSTEM DESIGN"))
    story.append(card_table([
        ["Technical Specification", "Value"],
        ["Solar Panel Quantity", str(panel_quantity)],
        ["Solar Panel Capacity", f"{panel_capacity} W each"],
        ["Inverter Details", inverter_rating],
        ["Roof Area Requirement", f"{roof_area} sq.ft"],
        ["Estimated Generation", f"{estimated_generation:,.0f} kWh / Year"],
        ["Warranty Details", warranty_text],
    ]))
    story.append(Spacer(1, 8))
    design_icons = Table([["Panel Array", "Inverter", "Mounting", "Monitoring"]], colWidths=[42 * mm] * 4)
    design_icons.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F7FB")),
        ("GRID", (0, 0), (-1, -1), 0.8, colors.HexColor("#D6DCE5")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))
    story.append(design_icons)
    story.append(PageBreak())

    # Page 6: financial analysis
    story.append(section_title("FINANCIAL ANALYSIS"))
    story.append(card_table([
        ["Financial Metric", "Value"],
        ["Project Cost", money(project_cost)],
        ["Government Subsidy", money(government_subsidy)],
        ["Net Investment", money(net_investment)],
        ["Annual Savings", money(annual_savings)],
        ["Payback Period", f"{payback:.1f} Years"],
        ["ROI", f"{roi:.0f}%"],
    ]))
    story.append(Spacer(1, 8))
    story.append(subtitle("Solar vs Traditional Electricity"))
    story.append(card_table([
        ["Option", "25-Year Cost"],
        ["Traditional Electricity", money(lifetime_cost)],
        ["Solar Investment", money(net_investment)],
        ["Net Savings", money(savings_25_years - net_investment)],
    ]))
    story.append(Spacer(1, 8))
    emi_table = Table([
        ["Plan", "Monthly EMI"],
        ["12 Months", f"Rs. {round(project_cost / 12):,}"],
        ["24 Months", f"Rs. {round(project_cost / 24):,}"],
        ["36 Months", f"Rs. {round(project_cost / 36):,}"],
        ["60 Months", f"Rs. {round(project_cost / 60):,}"],
    ])
    emi_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.darkblue),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(emi_table)
    story.append(PageBreak())

    # Page 7: 25 year projection
    story.append(section_title("25 YEAR SAVINGS PROJECTION"))
    story.append(savings_curve())
    story.append(Spacer(1, 6))
    milestones = [1, 5, 10, 15, 20, 25]
    milestone_rows = [["Milestone", "Cumulative Savings"]]
    for year in milestones:
        milestone_rows.append([f"Year {year}", money(annual_savings * year)])
    story.append(card_table(milestone_rows))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"<b>Total Lifetime Savings:</b> {money(savings_25_years)}", styles["Title"]))
    story.append(PageBreak())

    # Page 8: environmental impact
    story.append(section_title("ENVIRONMENTAL IMPACT"))
    story.append(card_table([
        ["Impact Metric", "Value"],
        ["Trees Saved", str(round(system_size * 35))],
        ["CO2 Reduction", f"{carbon_offset} Tons / Year"],
        ["Green Energy Generated", f"{estimated_generation:,.0f} kWh / Year"],
        ["Equivalent Cars Removed", str(equivalent_cars_removed)],
        ["Environmental Contribution Score", f"{environmental_score}/100"],
    ]))
    story.append(Spacer(1, 8))
    story.append(dashboard_chart([round(system_size * 35), carbon_offset, estimated_generation / 10], ["Trees", "CO2", "Energy"], "Sustainability Snapshot", kind="bar"))
    story.append(PageBreak())

    # Page 9: installation roadmap
    story.append(section_title("INSTALLATION ROADMAP"))
    story.append(Paragraph("A clear step-by-step rollout designed to keep the process organized, predictable, and easy for the customer to follow.", styles["BodyText"]))
    story.append(Spacer(1, 8))
    roadmap_steps = [
        ("01", "Site Survey", "On-site measurement, shading check, and roof assessment.", colors.HexColor("#FFD24A"), colors.HexColor("#0B1F3A")),
        ("02", "Engineering Design", "System sizing, layout planning, and technical finalization.", colors.HexColor("#0E2B55"), colors.HexColor("#FFD24A")),
        ("03", "Documentation", "Approvals, forms, and net-metering paperwork preparation.", colors.HexColor("#173A67"), colors.HexColor("#FFFFFF")),
        ("04", "Material Procurement", "Premium panels, inverter, and balance-of-system components arranged.", colors.HexColor("#0B1F3A"), colors.HexColor("#FFD24A")),
        ("05", "Installation", "Mounting structure, wiring, and system assembly completed.", colors.HexColor("#2D4E7C"), colors.HexColor("#FFFFFF")),
        ("06", "Testing", "Electrical checks, safety validation, and performance verification.", colors.HexColor("#173A67"), colors.HexColor("#FFD24A")),
        ("07", "Net Metering", "Utility coordination and meter integration finalized.", colors.HexColor("#0E2B55"), colors.HexColor("#FFFFFF")),
        ("08", "System Activation", "Final handover, monitoring setup, and customer walkthrough.", colors.HexColor("#0B1F3A"), colors.HexColor("#FFD24A")),
    ]
    roadmap_rows = []
    for index in range(0, len(roadmap_steps), 2):
        left = timeline_card(*roadmap_steps[index])
        right = timeline_card(*roadmap_steps[index + 1])
        roadmap_rows.append([left, right])
    roadmap_grid = Table(roadmap_rows, colWidths=[84 * mm, 84 * mm], hAlign="LEFT")
    roadmap_grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(roadmap_grid)
    story.append(PageBreak())

    # Page 10: why choose veronic
    story.append(section_title("WHY CHOOSE VERONIC SOLAR"))
    story.append(card_table([
        ["Trust Factor", "Value"],
        ["Industry Experience", "Proven project execution"],
        ["Quality Equipment", "Premium components"],
        ["Certified Installation Team", "Skilled engineering support"],
        ["After-Sales Support", "Ongoing customer care"],
        ["Warranty Coverage", "Long-term protection"],
        ["Fast Installation", "Organized deployment"],
    ]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Customer-first delivery with clear communication, reliable timelines, and a premium ownership experience.", styles["Normal"]))
    story.append(PageBreak())

    # Page 11: EMI and payment options
    story.append(section_title("EMI & PAYMENT OPTIONS"))
    plans = [
        ("Full Payment", net_investment, net_investment, "0%", net_investment),
        ("12 Month EMI", net_investment / 12, net_investment * 0.25, "12%", net_investment * 1.12),
        ("24 Month EMI", net_investment / 24, net_investment * 0.20, "13%", net_investment * 1.13),
        ("36 Month EMI", net_investment / 36, net_investment * 0.15, "14%", net_investment * 1.14),
        ("60 Month EMI", net_investment / 60, net_investment * 0.10, "15%", net_investment * 1.15),
    ]
    story.append(Paragraph("Choose a payment path that fits the project size and cash flow. The highlighted option is the most balanced for most customers.", styles["BodyText"]))
    story.append(Spacer(1, 8))
    emi_cards = [
        emi_card("Full Payment", *plans[0][1:], featured=False),
        emi_card("12 Month EMI", *plans[1][1:], featured=False),
        emi_card("24 Month EMI", *plans[2][1:], featured=True),
        emi_card("36 Month EMI", *plans[3][1:], featured=False),
        emi_card("60 Month EMI", *plans[4][1:], featured=False),
    ]
    emi_grid_rows = [
        [emi_cards[0], emi_cards[1]],
        [emi_cards[2], emi_cards[3]],
        [emi_cards[4], Spacer(1, 1)],
    ]
    emi_grid = Table(emi_grid_rows, colWidths=[84 * mm, 84 * mm], hAlign="LEFT")
    emi_grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(emi_grid)
    story.append(Spacer(1, 8))
    story.append(card_table([
        ["Plan", "Why It Works Best"],
        ["Full Payment", "Lowest overall cost and fastest ownership transfer."],
        ["24 Month EMI", "Balanced monthly outflow with a strong payoff window."],
        ["60 Month EMI", "Lowest monthly commitment for cash preservation."],
    ]))
    story.append(PageBreak())

    # Page 12: thank you and next steps
    story.append(section_title("THANK YOU FOR CHOOSING A SUSTAINABLE FUTURE"))
    story.append(Spacer(1, 6))
    story.append(Paragraph("VERONIC SOLAR", styles["Title"]))
    story.append(Paragraph("Company Name: VERONIC SOLAR", styles["Normal"]))
    story.append(Paragraph("Contact Number: 9510653051", styles["Normal"]))
    story.append(Paragraph("Email: veronic.infotech@gmail.com", styles["Normal"]))
    story.append(Paragraph("Website: veronic.netlify.app", styles["Normal"]))
    story.append(Spacer(1, 8))
    story.append(qr_block(f"VERONIC SOLAR|{lead.name}|{lead.phone}|{proposal_number}"))
    story.append(Spacer(1, 8))
    story.append(subtitle("Next Steps"))
    story.append(card_table([
        ["Step", "Action"],
        ["1", "Proposal Approval"],
        ["2", "Site Verification"],
        ["3", "Installation Scheduling"],
    ]))

    doc.build(story)

    db.close()

    return FileResponse(
        pdf_file,
        filename="Veronic_Solar_Proposal.pdf",
        media_type="application/pdf"
    )


@app.get("/emi/{lead_id}")
def calculate_emi(lead_id: int):
    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    db.close()

    if not lead:
        return {"message": "Lead not found"}

    project_cost = (lead.system_size or 0) * 50000

    return {
        "project_cost": project_cost,
        "12_month": round(project_cost / 12),
        "24_month": round(project_cost / 24),
        "36_month": round(project_cost / 36),
        "60_month": round(project_cost / 60)
    }
@app.get("/lead-chart")
def lead_chart():
    db = SessionLocal()
    leads = db.query(Lead).all()

    months = {}
    for lead in leads:
        if not lead.created_at:
            continue
        month = lead.created_at.strftime("%b")
        months[month] = months.get(month, 0) + 1

    db.close()
    return months


@app.get("/revenue-chart")
def revenue_chart():
    db = SessionLocal()
    leads = db.query(Lead).all()

    months = {}
    for lead in leads:
        if not lead.created_at:
            continue
        month = lead.created_at.strftime("%b")
        revenue = (lead.system_size or 0) * 50000
        months[month] = months.get(month, 0) + revenue

    db.close()
    return months


@app.get("/notifications")
def notifications():
    db = SessionLocal()
    overdue = []
    today = datetime.utcnow().date()
    leads = db.query(Lead).all()

    for lead in leads:
        if (
            lead.next_followup_date
            and lead.next_followup_date.date() <= today
        ):
            overdue.append({
                "name": lead.name
            })

    db.close()
    return overdue


@app.get("/whatsapp/{lead_id}")
def whatsapp_data(lead_id: int, request: Request):
    db = SessionLocal()

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    db.close()

    if not lead:
        return {"error": "Lead not found"}

    phone = re.sub(r"\D", "", str(lead.phone or ""))
    system_size_text = f"{lead.system_size:g}kW" if lead.system_size is not None else "N/A"
    annual_savings_text = f"₹{lead.annual_savings:,.0f}" if lead.annual_savings is not None else "₹0"
    proposal_pdf_link = f"{str(request.base_url)}generate-proposal/{lead_id}"

    message = f"""Hello {lead.name},
Your Solar Proposal is Ready.
⚡ System Size: {system_size_text}
💰 Annual Savings: {annual_savings_text}
Download Proposal: {proposal_pdf_link}

Thank you,
Veronic Solar"""

    return {
        "phone": phone,
        "message": message,
        "proposal_pdf_link": proposal_pdf_link
    }