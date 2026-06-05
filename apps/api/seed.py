import asyncio
import uuid
import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.db.base import Base
from app.db.models import (
    NyaybandhuSession,
    TranscriptEvent,
    VicharakReview,
    BenchNoteEntry,
    UploadedDocument,
    JudicialReport
)

async def seed_data():
    print("Database seeding starting...")
    engine = create_async_engine(settings.DATABASE_URL)
    
    # Verify tables are created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
    
    async with SessionLocal() as db:
        # Let's delete existing records
        from sqlalchemy import delete
        await db.execute(delete(TranscriptEvent))
        await db.execute(delete(NyaybandhuSession))
        await db.execute(delete(BenchNoteEntry))
        await db.execute(delete(UploadedDocument))
        await db.execute(delete(VicharakReview))
        await db.execute(delete(JudicialReport))
        await db.commit()
        
        # 1. Seed Nyaybandhu Sessions
        print("Seeding Nyaybandhu Sessions...")
        # Active Nyaybandhu Session
        nb_active_id = "nb-active-session-12345"
        nb_active = NyaybandhuSession(
            id=nb_active_id,
            title="Pleadings Audit - Clause 4 Equality Challenge",
            description="Active review session checking Class A demographic categories exclusions under the latest pleadings draft.",
            mode="real-life",
            opposing_counsel_strategy="textualist",
            status="active",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        )
        db.add(nb_active)
        
        # Finalized Nyaybandhu Session
        nb_finalized_id = "nb-finalized-session-67890"
        nb_finalized = NyaybandhuSession(
            id=nb_finalized_id,
            title="Precedent Simulation Arena - Rao v. State",
            description="Sandbox simulation testing petitioner arguments against dynamic counter arguments based on the 2018 Rao precedent.",
            mode="practice",
            opposing_counsel_strategy="dynamic",
            status="finalized",
            summary="Comprehensive adversarial review of Clause 4. Focused on Demographics-based Category A exclusions. Petitioner successfully distinguished the 2018 precedent.",
            verdict="Verdict: 62% leaning towards the Petitioner. Opposing counsel's reliance on Case 2018 SC 495 was mitigated.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
        )
        db.add(nb_finalized)
        
        # Seed Transcript Events for nb_active
        db.add(TranscriptEvent(
            id=str(uuid.uuid4()),
            session_id=nb_active_id,
            speaker="Bench / Presiding Judge",
            role="bench",
            text="The tribunal is now convened. We will examine the statutory challenge to Clause 4. Counsel for the Petitioner may present opening claims.",
            event_type="argument",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        ))
        
        # Seed Transcript Events for nb_finalized
        db.add(TranscriptEvent(
            id=str(uuid.uuid4()),
            session_id=nb_finalized_id,
            speaker="Bench / Presiding Judge",
            role="bench",
            text="The tribunal is now convened. We will examine the Rao v. State precedent applicability.",
            event_type="argument",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
        ))
        db.add(TranscriptEvent(
            id=str(uuid.uuid4()),
            session_id=nb_finalized_id,
            speaker="Petitioner Counsel (System)",
            role="petitioner",
            text="Obliged, My Lord. We submit that Clause 4 classification violates fundamental equality principles.",
            event_type="argument",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3) + datetime.timedelta(minutes=5)
        ))
        db.add(TranscriptEvent(
            id=str(uuid.uuid4()),
            session_id=nb_finalized_id,
            speaker="Opposing Counsel (AI Agent)",
            role="respondent",
            text="The state classification holds reasonable historical context as ruled in 2018 SC 495.",
            event_type="argument",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3) + datetime.timedelta(minutes=10)
        ))
        
        # 2. Seed Vicharak Reviews
        print("Seeding VicharakBandhu Reviews...")
        # Active Vicharak Review
        vb_active_id = "vb-active-review-12345"
        vb_active = VicharakReview(
            id=vb_active_id,
            title="Judicial Review Folder - Section 8 Exemption Sweep",
            case_summary="Factual review of timeline events and citation entries relative to the Section 8 administrative exemptions.",
            status="active",
            structure={
                "claims": [
                    {"side": "side_a", "text": "Petitioner claims Section 8 excludes critical regulatory safeguards."},
                    {"side": "side_b", "text": "Respondent argues exclusions are justified by national security caveats."}
                ],
                "timeline": [
                    {"time": "2024-03-01", "event": "Administrative exemption order issued"},
                    {"time": "2024-04-10", "event": "Petitioner files appeal challenging scope"}
                ]
            },
            confidence_ledger={
                "side_a_confidence": 55,
                "side_b_confidence": 45,
                "change_log": [
                    {"timestamp": "2026-06-04T12:00:00Z", "entry_title": "Security Log Inconsistency", "reason": "Weak source corroboration on security logs.", "net_effect": 5}
                ],
                "caution_flags": [
                    {"id": "flag-1", "title": "Missing Security Log", "description": "The administrative record lacks the original audit files for 2024.", "severity": "high"}
                ],
                "ledger": [
                    {"label": "Regulatory Safeguards", "score": 60, "status": "verified"},
                    {"label": "National Security Caveats", "score": 40, "status": "unverified"}
                ]
            },
            suggestions={
                "points": [
                    {"id": "suggest-1", "text": "Request production of the 2024 audit log to verify national security claims.", "type": "warning"}
                ]
            },
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
        )
        db.add(vb_active)
        
        # Finalized Vicharak Review
        vb_finalized_id = "vb-finalized-review-67890"
        vb_finalized = VicharakReview(
            id=vb_finalized_id,
            title="Judicial Review Folder - Land Acquisition Dispute",
            case_summary="Statutory compliance and timeline review of the municipal land acquisition order for the Zone C highway project.",
            status="finalized",
            structure={
                "claims": [
                    {"side": "side_a", "text": "Petitioner claims compensation calculations ignored market rate guidelines."},
                    {"side": "side_b", "text": "Respondent claims Section 12 guidelines were fully adhered to."}
                ],
                "timeline": [
                    {"time": "2023-05-15", "event": "Acquisition notice issued under Section 4"},
                    {"time": "2023-11-20", "event": "Final compensation award announced"}
                ]
            },
            confidence_ledger={
                "side_a_confidence": 75,
                "side_b_confidence": 25,
                "change_log": [
                    {"timestamp": "2026-06-03T10:00:00Z", "entry_title": "Compensation Discrepancy", "reason": "Verified that compensation rates used 2020 guidelines instead of 2023 guidelines.", "net_effect": 25}
                ],
                "caution_flags": [],
                "ledger": [
                    {"label": "Compensation guidelines", "score": 75, "status": "verified"},
                    {"label": "Adherence to Section 12", "score": 25, "status": "discrepancy"}
                ]
            },
            suggestions={
                "points": [
                    {"id": "suggest-2", "text": "Factual error in compensation guideline calculation. Recommend recalculation according to the 2023 schedule.", "type": "error"}
                ]
            },
            report={
                "compiled_at": (datetime.datetime.utcnow() - datetime.timedelta(hours=10)).isoformat(),
                "case_overview": {"title": "Judicial Review Folder - Land Acquisition Dispute", "summary": "Statutory compliance and timeline review of the Zone C highway land acquisition order.", "status": "finalized"},
                "extracted_structure": {
                    "claims": [
                        {"side": "side_a", "text": "Petitioner claims compensation calculations ignored market rate guidelines."},
                        {"side": "side_b", "text": "Respondent claims Section 12 guidelines were fully adhered to."}
                    ],
                    "timeline": [
                        {"time": "2023-05-15", "event": "Acquisition notice issued under Section 4"},
                        {"time": "2023-11-20", "event": "Final compensation award announced"}
                    ]
                },
                "bench_notes_summary": {
                    "total_notes": 2,
                    "timeline_count": 1,
                    "citation_count": 1,
                    "testimony_count": 0
                },
                "confidence_summary": {
                    "side_a_confidence": 75,
                    "side_b_confidence": 25,
                    "ledger": [
                        {"label": "Compensation guidelines", "score": 75, "status": "verified"},
                        {"label": "Adherence to Section 12", "score": 25, "status": "discrepancy"}
                    ],
                    "change_log": [
                        {"timestamp": "2026-06-03T10:00:00Z", "entry_title": "Compensation Discrepancy", "reason": "Verified that compensation rates used 2020 guidelines instead of 2023 guidelines.", "net_effect": 25}
                    ]
                },
                "caution_flags": [],
                "points_to_keep_in_mind": [
                    {"id": "suggest-2", "text": "Factual error in compensation guideline calculation. Recommend recalculation according to the 2023 schedule.", "type": "error"}
                ],
                "findings_summary": "The land acquisition review indicates a substantial procedural deviation regarding the guidelines applied to compensation calculations. Zone C acquisition used obsolete 2020 guidelines, violating the statutory directive requiring active market value indexation at the time of final award."
            },
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=4)
        )
        db.add(vb_finalized)
        
        # Bench Note Entries for vb_active
        db.add(BenchNoteEntry(
            id=str(uuid.uuid4()),
            review_id=vb_active_id,
            title="Missing Security Log",
            note_body="The administrative records do not contain the audit trails verifying security claims.",
            category="citation",
            side_impact="petitioner",
            materiality="high",
            verification_status="discrepancy",
            source_reference="Exhibit C Page 12",
            confidence_effect=15.0,
            effect_type="pro-petitioner",
            source_strength="weak",
            ai_detected=True,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        ))
        
        # Bench Note Entries for vb_finalized
        db.add(BenchNoteEntry(
            id="bn-dispute-1",
            review_id=vb_finalized_id,
            title="Obsolete Guideline Application",
            note_body="Factual evidence shows compensation calculations used 2020 guidelines rather than mandatory 2023 guidelines.",
            category="timeline",
            side_impact="petitioner",
            materiality="high",
            verification_status="verified",
            source_reference="Compensation Schedule D",
            confidence_effect=25.0,
            effect_type="pro-petitioner",
            source_strength="strong",
            ai_detected=False,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
        ))
        
        # Seed Documents for vb_active
        db.add(UploadedDocument(
            id=str(uuid.uuid4()),
            review_id=vb_active_id,
            filename="Section_8_Exemption_Appeal.pdf",
            content_type="application/pdf",
            file_type="document",
            file_size=125430,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
        ))
        
        # 3. Seed Judicial Reports
        print("Seeding Judicial Reports...")
        db.add(JudicialReport(
            id="report-finalized-nyaybandhu",
            title="Adversarial Review Report - Precedent Simulation (Rao v. State)",
            content="""# Judicial Verdict Summary & Simulation Analysis
## Module: Nyaybandhu (Adversarial Simulation)
## Case Reference: Precedent Simulation Arena - Rao v. State

### 1. Executive Summary
This report digests the adversarial pleadings simulation testing petitioner constitutional challenges against a tentative opposing counsel stance referencing the Rao v. State precedent.

### 2. Verdict Probability Leaning
- **Petitioner Leaning Probability**: 62%
- **Respondent Leaning Probability**: 38%

### 3. Key Findings
* Petitioner successfully isolated the 2018 Rao precedent by demonstrating changes in statutory wording under the 2021 amendments.
* Opposing counsel's reliance on historical category exclusions was mitigated by rational nexus failures.

---
*Disclaimer: This report is an assistive decision-support analysis compiled by the Nyaybandhu module of the Nayak Suite. It does not constitute a final judicial verdict or binding legal ruling.*
""",
            module="nyaybandhu",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
        ))
        
        db.add(JudicialReport(
            id="report-finalized-vicharakbandhu",
            title="Judicial Review Report - Land Acquisition Dispute",
            content="""# Judicial Review Analysis Report
## Module: VicharakBandhu (Review & Audit Support)
## Case Folder: Land Acquisition Dispute

### 1. Executive Summary
A comprehensive statutory review was conducted on the administrative acquisition file for Zone C highway project to determine municipal compliance.

### 2. Core Audit Findings
- **Compensation Guidelines**: PROCEDURAL ERROR. The municipal authority computed compensation utilizing the 2020 schedule, bypassing the statutory requirement to apply the active 2023 index.
- **Section 12 Adherence**: Deficient.

### 3. Confidence Ledger Metrics
- **Side A (Petitioner - Procedural Violations)**: 75% confidence
- **Side B (Respondent - Guideline Adherence)**: 25% confidence

---
*Disclaimer: This report is a decision-support analysis compiled by the VicharakBandhu module of the Nayak Suite. It serves as an assistive document for human judicial officers and is not an autonomous ruling.*
""",
            module="vicharakbandhu",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=4)
        ))
        
        await db.commit()
        print("Database successfully seeded!")

if __name__ == "__main__":
    asyncio.run(seed_data())
