import uuid
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import VicharakReview, UploadedDocument, BenchNoteEntry

class VicharakService:
    @staticmethod
    async def create_review(db: AsyncSession, title: str, case_summary: Optional[str] = None) -> VicharakReview:
        review_id = str(uuid.uuid4())
        review = VicharakReview(
            id=review_id,
            title=title,
            case_summary=case_summary,
            status="active",
            created_at=datetime.utcnow()
        )
        db.add(review)
        await db.commit()
        await db.refresh(review)
        return review

    @staticmethod
    async def get_review(db: AsyncSession, review_id: str) -> Optional[VicharakReview]:
        result = await db.execute(select(VicharakReview).where(VicharakReview.id == review_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_history(db: AsyncSession) -> List[VicharakReview]:
        result = await db.execute(select(VicharakReview).order_by(VicharakReview.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_documents(db: AsyncSession, review_id: str) -> List[UploadedDocument]:
        result = await db.execute(
            select(UploadedDocument)
            .where(UploadedDocument.review_id == review_id)
            .order_by(UploadedDocument.created_at.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_entries(db: AsyncSession, review_id: str) -> List[BenchNoteEntry]:
        result = await db.execute(
            select(BenchNoteEntry)
            .where(BenchNoteEntry.review_id == review_id)
            .order_by(BenchNoteEntry.created_at.asc())
        )
        return list(result.scalars().all())

    @classmethod
    async def ingest_text(cls, db: AsyncSession, review_id: str, text: str) -> VicharakReview:
        review = await cls.get_review(db, review_id)
        if not review:
            raise ValueError("Review case not found")

        # Mock structured extraction
        review.case_summary = text[:300] + "..." if len(text) > 300 else text
        review.structure = {
            "claims": [
                {"side": "Petitioner", "text": "Statutory categorizations violate equal protection under Article 14."},
                {"side": "Respondent", "text": "Clause 4 classification is a reasonable, demographics-based policy."}
            ],
            "timeline": [
                {"time": "14:00", "event": "Affidavit claims petitioner presence at office location A."},
                {"time": "14:15", "event": "Exhibit D cellular logs record petitioner check at highway B (45km distance)."}
            ]
        }

        review.suggestions = {
            "points": [
                {"id": "s-1", "text": "Focus cross-examination on the 15-minute travel time discrepancy between location A and B."},
                {"id": "s-2", "text": "Verify whether the 2021 statutory amendments affect the retrospective claims."}
            ]
        }

        # Seed initial default Bench Notes
        note_1 = BenchNoteEntry(
            id=str(uuid.uuid4()),
            review_id=review_id,
            title="Evidence Timeline Contradiction",
            note_body="Factual travel discrepancy: 45km covered in 15 minutes is physically improbable for transit logs.",
            category="timeline",
            side_impact="respondent",
            materiality="high",
            verification_status="discrepancy",
            source_reference="Exhibit D, Page 4",
            confidence_effect=-15.0,
            effect_type="contradiction",
            source_strength="strong",
            ai_detected=True,
            created_at=datetime.utcnow()
        )
        note_2 = BenchNoteEntry(
            id=str(uuid.uuid4()),
            review_id=review_id,
            title="Statutory Citation Mismatch",
            note_body="Brief references Section 43A of Act X, which was repealed by the 2023 Amendment.",
            category="citation",
            side_impact="respondent",
            materiality="medium",
            verification_status="discrepancy",
            source_reference="Writ Petition, Page 12",
            confidence_effect=-5.0,
            effect_type="contradiction",
            source_strength="moderate",
            ai_detected=True,
            created_at=datetime.utcnow()
        )
        db.add(note_1)
        db.add(note_2)

        await db.commit()
        
        # Calculate ledger after inserting entries
        await cls.recalculate_ledger(db, review_id)
        await db.refresh(review)
        return review

    @classmethod
    async def add_document(cls, db: AsyncSession, review_id: str, filename: str, content_type: str, file_type: str, file_size: int) -> UploadedDocument:
        doc_id = str(uuid.uuid4())
        doc = UploadedDocument(
            id=doc_id,
            review_id=review_id,
            filename=filename,
            content_type=content_type,
            file_type=file_type,
            file_size=file_size,
            created_at=datetime.utcnow()
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    @classmethod
    async def add_entry(cls, db: AsyncSession, review_id: str, title: str, note_body: str, category: str, side_impact: str, materiality: str, verification_status: str, source_reference: Optional[str] = None, confidence_effect: float = 0.0, effect_type: Optional[str] = "neutral", source_strength: Optional[str] = "moderate", ai_detected: bool = False) -> BenchNoteEntry:
        entry_id = str(uuid.uuid4())
        entry = BenchNoteEntry(
            id=entry_id,
            review_id=review_id,
            title=title,
            note_body=note_body,
            category=category,
            side_impact=side_impact,
            materiality=materiality,
            verification_status=verification_status,
            source_reference=source_reference,
            confidence_effect=confidence_effect,
            effect_type=effect_type,
            source_strength=source_strength,
            ai_detected=ai_detected,
            created_at=datetime.utcnow()
        )
        db.add(entry)
        await db.commit()
        
        # Recalculate ledger scores based on new note impact
        await cls.recalculate_ledger(db, review_id)
        await db.refresh(entry)
        return entry

    @classmethod
    async def update_entry(cls, db: AsyncSession, entry_id: str, data: dict) -> Optional[BenchNoteEntry]:
        result = await db.execute(select(BenchNoteEntry).where(BenchNoteEntry.id == entry_id))
        entry = result.scalar_one_or_none()
        if not entry:
            return None
            
        for k, v in data.items():
            setattr(entry, k, v)
                
        await db.commit()
        
        # Recalculate ledger scores
        await cls.recalculate_ledger(db, entry.review_id)
        await db.refresh(entry)
        return entry

    @classmethod
    async def delete_entry(cls, db: AsyncSession, entry_id: str) -> bool:
        result = await db.execute(select(BenchNoteEntry).where(BenchNoteEntry.id == entry_id))
        entry = result.scalar_one_or_none()
        if not entry:
            return False
            
        review_id = entry.review_id
        await db.delete(entry)
        await db.commit()
        
        # Recalculate ledger scores
        await cls.recalculate_ledger(db, review_id)
        return True

    @staticmethod
    async def recalculate_suggestions(db: AsyncSession, review: VicharakReview, entries: List[BenchNoteEntry]):
        suggestions_points = []
        
        # Check if static ingestion suggestions exist and preserve them (ids s-1 and s-2)
        if review.suggestions and "points" in review.suggestions:
            for p in review.suggestions["points"]:
                if p.get("id") in ["s-1", "s-2"]:
                    suggestions_points.append(p)
                    
        # Add dynamic suggestions from notes
        for entry in entries:
            if entry.verification_status == "discrepancy":
                suggestions_points.append({
                    "id": f"s-discrepancy-{entry.id}",
                    "text": f"[Contradiction] Review conflict in '{entry.title}' (Category: {entry.category}). Ref: {entry.source_reference or 'N/A'}.",
                    "type": "contradiction"
                })
            if entry.source_strength == "weak":
                suggestions_points.append({
                    "id": f"s-source-{entry.id}",
                    "text": f"[Weak Source] Verify references in '{entry.title}' ({entry.source_reference or 'No source specified'}).",
                    "type": "weak_source"
                })
            if entry.category == "timeline" and entry.verification_status == "discrepancy":
                suggestions_points.append({
                    "id": f"s-timeline-{entry.id}",
                    "text": f"[Timeline Anomaly] Cross-reference timestamp sequencing in '{entry.title}'.",
                    "type": "timeline_anomaly"
                })
            if entry.verification_status == "unverified" and entry.materiality == "high":
                suggestions_points.append({
                    "id": f"s-unverified-{entry.id}",
                    "text": f"[Unverified Claim] High-materiality point '{entry.title}' requires independent verification.",
                    "type": "unverified_claim"
                })
            if entry.materiality == "high" and entry.verification_status != "verified":
                suggestions_points.append({
                    "id": f"s-materiality-{entry.id}",
                    "text": f"[High Materiality] Verify and resolve concerns in '{entry.title}'.",
                    "type": "high_materiality"
                })
            if entry.ai_detected:
                suggestions_points.append({
                    "id": f"s-ai-{entry.id}",
                    "text": f"[AI Alert] Review AI-flagged note: '{entry.title}' in {entry.category}.",
                    "type": "ai_concern"
                })
                
        if not suggestions_points:
            suggestions_points.append({
                "id": "s-default",
                "text": "Add Bench Notes to populate key review suggestions dynamically.",
                "type": "info"
            })
            
        review.suggestions = {"points": suggestions_points}

    @staticmethod
    async def recalculate_ledger(db: AsyncSession, review_id: str):
        # Fetch all entries
        result = await db.execute(select(BenchNoteEntry).where(BenchNoteEntry.review_id == review_id))
        entries = result.scalars().all()
        
        # Transparent calculations
        side_a_confidence = 80.0
        side_b_confidence = 80.0
        
        cit_score = 90.0
        time_score = 90.0
        coh_score = 85.0
        
        change_log = []
        caution_flags = []
        
        for entry in entries:
            base_effect = entry.confidence_effect or 0.0
            
            # Materiality Factor
            materiality_factor = 1.0
            if entry.materiality == "high":
                materiality_factor = 1.5
            elif entry.materiality == "low":
                materiality_factor = 0.5
                
            # Verification status Factor
            verification_factor = 1.0
            if entry.verification_status == "unverified":
                verification_factor = 0.2  # Unverified claims should not strongly boost/change confidence
            elif entry.verification_status == "discrepancy":
                verification_factor = 1.5  # Amplified impact for discrepancies
                
            # Source Strength Factor
            source_strength_factor = 1.0
            if entry.source_strength == "strong":
                source_strength_factor = 1.2
            elif entry.source_strength == "weak":
                source_strength_factor = 0.5
                
            net_effect = base_effect * materiality_factor * verification_factor * source_strength_factor
            
            # Recalculate Side Confidences
            if entry.side_impact == "petitioner":
                side_a_confidence = max(0.0, min(100.0, side_a_confidence + net_effect))
            elif entry.side_impact == "respondent":
                side_b_confidence = max(0.0, min(100.0, side_b_confidence + net_effect))
                
            # Recalculate Category Scores
            if entry.category == "citation":
                cit_score = max(0.0, min(100.0, cit_score + net_effect))
            elif entry.category == "timeline":
                time_score = max(0.0, min(100.0, time_score + net_effect))
            else:
                coh_score = max(0.0, min(100.0, coh_score + net_effect))
                
            # Log Recalculation Step
            origin = "AI-detected" if entry.ai_detected else "Human-entered"
            action = "reduced" if net_effect < 0 else "increased"
            side_label = f"{entry.side_impact.capitalize()}" if entry.side_impact in ["petitioner", "respondent"] else "neutral categories"
            
            reason_str = (
                f"[{origin}] {entry.materiality.capitalize()} materiality {entry.category} note "
                f"('{entry.title}') targeting {side_label} {action} confidence by {abs(net_effect):.2f}%. "
                f"Factors: base={entry.confidence_effect:+.1f}%, "
                f"verification='{entry.verification_status}' (x{verification_factor}), "
                f"source_strength='{entry.source_strength}' (x{source_strength_factor})."
            )
            change_log.append({
                "timestamp": datetime.utcnow().isoformat(),
                "entry_title": entry.title,
                "reason": reason_str,
                "net_effect": float(net_effect)
            })
            
            # Caution Flags logic
            if entry.verification_status == "discrepancy" and entry.materiality == "high":
                caution_flags.append({
                    "id": f"caution-{entry.id}",
                    "title": f"High Materiality Discrepancy: {entry.title}",
                    "description": f"Category '{entry.category}' discrepancy in {entry.source_reference or 'unspecified location'}. Details: {entry.note_body}",
                    "severity": "critical"
                })
            elif entry.verification_status == "unverified" and entry.materiality == "high":
                caution_flags.append({
                    "id": f"caution-{entry.id}",
                    "title": f"High Materiality Unverified Claim: {entry.title}",
                    "description": f"Unverified claim in category '{entry.category}' with high materiality. Details: {entry.note_body}",
                    "severity": "warning"
                })
                
        # Fetch review to update
        rev_res = await db.execute(select(VicharakReview).where(VicharakReview.id == review_id))
        review = rev_res.scalar_one_or_none()
        if review:
            review.confidence_ledger = {
                "side_a_confidence": float(side_a_confidence),
                "side_b_confidence": float(side_b_confidence),
                "change_log": change_log,
                "caution_flags": caution_flags,
                "ledger": [
                    {"label": "Statutory Citation Authority", "score": float(cit_score), "status": "High" if cit_score >= 80 else "Marginal" if cit_score >= 50 else "Critical"},
                    {"label": "Procedural Timeline Consistency", "score": float(time_score), "status": "High" if time_score >= 80 else "Marginal" if time_score >= 50 else "Critical"},
                    {"label": "Factual Declarations Coherence", "score": float(coh_score), "status": "High" if coh_score >= 80 else "Marginal" if coh_score >= 50 else "Critical"}
                ]
            }
            # Dynamically recalculate suggestions as well
            await VicharakService.recalculate_suggestions(db, review, entries)
            await db.commit()

    @staticmethod
    async def compile_report(db: AsyncSession, review_id: str) -> Optional[VicharakReview]:
        result = await db.execute(select(VicharakReview).where(VicharakReview.id == review_id))
        review = result.scalar_one_or_none()
        if not review:
            return None
            
        review.status = "finalized"
        
        # Gather documents and entries
        doc_res = await db.execute(select(UploadedDocument).where(UploadedDocument.review_id == review_id))
        docs = doc_res.scalars().all()
        
        entry_res = await db.execute(select(BenchNoteEntry).where(BenchNoteEntry.review_id == review_id))
        entries = entry_res.scalars().all()
        
        report_data = {
            "compiled_at": datetime.utcnow().isoformat(),
            "case_overview": {
                "title": review.title,
                "summary": review.case_summary or "No summary brief available.",
                "status": "Finalized"
            },
            "extracted_structure": review.structure or {"claims": [], "timeline": []},
            "bench_notes_summary": {
                "total_notes": len(entries),
                "timeline_count": sum(1 for e in entries if e.category == "timeline"),
                "citation_count": sum(1 for e in entries if e.category == "citation"),
                "testimony_count": sum(1 for e in entries if e.category == "testimony"),
                "notes": [
                    {
                        "title": e.title,
                        "category": e.category,
                        "side_impact": e.side_impact,
                        "materiality": e.materiality,
                        "verification_status": e.verification_status,
                        "source_reference": e.source_reference,
                        "confidence_effect": e.confidence_effect,
                        "effect_type": e.effect_type,
                        "source_strength": e.source_strength,
                        "ai_detected": e.ai_detected
                    }
                    for e in entries
                ]
            },
            "confidence_summary": {
                "side_a_confidence": review.confidence_ledger.get("side_a_confidence", 80.0) if review.confidence_ledger else 80.0,
                "side_b_confidence": review.confidence_ledger.get("side_b_confidence", 80.0) if review.confidence_ledger else 80.0,
                "ledger": review.confidence_ledger.get("ledger", []) if review.confidence_ledger else [],
                "change_log": review.confidence_ledger.get("change_log", []) if review.confidence_ledger else []
            },
            "caution_flags": review.confidence_ledger.get("caution_flags", []) if review.confidence_ledger else [],
            "points_to_keep_in_mind": review.suggestions.get("points", []) if review.suggestions else [],
            "findings_summary": (
                f"Judicial Review Report compiled for case: '{review.title}'. "
                f"A total of {len(docs)} documents were ingested. Audits flagged {len(entries)} key anomalies "
                f"across procedural timelines and statutory citations. "
                "The findings are generated to assist judicial explainability and do not represent an autonomous verdict. "
                "All assessments are human-reviewed and subject to professional legal review."
            )
        }
        review.report = report_data
        
        await db.commit()
        await db.refresh(review)
        return review
