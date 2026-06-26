from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from datetime import datetime
from database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String)
    phone = Column(String)
    notes = Column(String, default="")

    bill = Column(Float)
    system_size = Column(Float)
    annual_savings = Column(Float)

    survey_date = Column(Date, nullable=True)
    survey_status = Column(
        String,
        default="pending"
    )

    status = Column(String, default="new")

    follow_up_count = Column(Integer, default=0)

    next_followup_date = Column(
        DateTime,
        nullable=True
    )

    next_call_date = Column(
        Date,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    last_contacted = Column(
        DateTime,
        default=datetime.utcnow
    )