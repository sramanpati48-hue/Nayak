import asyncio
import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import NyaybandhuSession, TranscriptEvent

class NyaybandhuService:
    @staticmethod
    async def create_session(db: AsyncSession, title: str, description: Optional[str], mode: str, opposing_counsel_strategy: str, config: Optional[dict] = None) -> NyaybandhuSession:
        session_id = str(uuid.uuid4())
        session = NyaybandhuSession(
            id=session_id,
            title=title,
            description=description,
            mode=mode,
            opposing_counsel_strategy=opposing_counsel_strategy,
            status="active",
            created_at=datetime.utcnow(),
            config=config
        )
        db.add(session)
        
        # Insert initial startup event
        startup_event = TranscriptEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            speaker="Bench / Presiding Judge",
            role="bench",
            text="The tribunal is now convened. We will examine the statutory challenge to Clause 4. Counsel for the Petitioner may present opening claims.",
            event_type="argument",
            created_at=datetime.utcnow()
        )
        db.add(startup_event)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_session(db: AsyncSession, session_id: str) -> Optional[NyaybandhuSession]:
        result = await db.execute(select(NyaybandhuSession).where(NyaybandhuSession.id == session_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_history(db: AsyncSession) -> List[NyaybandhuSession]:
        result = await db.execute(select(NyaybandhuSession).order_by(NyaybandhuSession.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_events(db: AsyncSession, session_id: str) -> List[TranscriptEvent]:
        result = await db.execute(
            select(TranscriptEvent)
            .where(TranscriptEvent.session_id == session_id)
            .order_by(TranscriptEvent.created_at.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def answer_card(db: AsyncSession, session_id: str, card_id: str, selected_option: str) -> TranscriptEvent:
        # Fetch the card event to check who asked it
        result = await db.execute(select(TranscriptEvent).where(TranscriptEvent.id == card_id))
        card_event = result.scalar_one_or_none()
        
        # Create response text
        response_text = f"We clarify that: {selected_option}"
        
        # Insert response argument event
        response_event = TranscriptEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            speaker="Petitioner Counsel (System)",
            role="petitioner",
            text=response_text,
            event_type="argument",
            score_delta={"petitioner": 88, "respondent": 75} if card_id == "card-1" else {"petitioner": 92, "respondent": 78},
            created_at=datetime.utcnow()
        )
        db.add(response_event)
        
        # Update the card event in DB to show it is answered
        if card_event:
            card_data = dict(card_event.card_data or {})
            card_data["answered"] = True
            card_data["selected_option"] = selected_option
            card_event.card_data = card_data
            
        await db.commit()
        await db.refresh(response_event)
        return response_event

    @staticmethod
    async def finalize_session(db: AsyncSession, session_id: str) -> NyaybandhuSession:
        result = await db.execute(select(NyaybandhuSession).where(NyaybandhuSession.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found")
            
        session.status = "finalized"
        session.summary = (
            "Comprehensive adversarial review of Clause 4. Focused on Demographics-based Category A exclusions. "
            "Petitioner successfully distinguished the 2018 SC 495 precedent based on the subsequent 2021 statutory shifts."
        )
        session.verdict = (
            "Verdict: 62% leaning towards the Petitioner. Opposing counsel's reliance on Case 2018 SC 495 was mitigated. "
            "Petitioner's Article 14 challenge is deemed viable but subject to demographic burden of proof."
        )
        await db.commit()
        await db.refresh(session)
        return session

    @classmethod
    async def generate_debate_stream(cls, db: AsyncSession, session_id: str) -> AsyncGenerator[str, None]:
        # 1. Fetch current events to see where we are in the flow
        events = await cls.get_events(db, session_id)
        events_count = len(events)
        
        # Helper to format SSE strings
        def make_sse(event_name: str, data: dict) -> str:
            return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"

        # Check if the startup event exists
        if events_count <= 1:
            # --- START DEBATE TURN 1 (Petitioner opening) ---
            yield make_sse("turn_started", {"role": "petitioner", "speaker": "Petitioner Counsel (System)"})
            await asyncio.sleep(0.5)
            
            p_text = (
                "Obliged, My Lord. We submit that Clause 4 imposes an arbitrary classification violating "
                "the fundamental equality principles guaranteed under Article 14. The distinction drawn is neither "
                "rational nor has any nexus to the statutory objective."
            )
            # Yield in chunks
            words = p_text.split(" ")
            for i in range(0, len(words), 4):
                chunk = " ".join(words[i:i+4]) + " "
                yield make_sse("argument_chunk", {"chunk": chunk})
                await asyncio.sleep(0.1)
                
            # Save Petitioner opening event to DB
            evt_1_id = str(uuid.uuid4())
            evt_1 = TranscriptEvent(
                id=evt_1_id,
                session_id=session_id,
                speaker="Petitioner Counsel (System)",
                role="petitioner",
                text=p_text,
                event_type="argument",
                created_at=datetime.utcnow()
            )
            db.add(evt_1)
            await db.commit()
            
            # --- DEBATE TURN 2 (Respondent Counter) ---
            yield make_sse("turn_started", {"role": "respondent", "speaker": "Opposing Counsel (AI Agent)"})
            await asyncio.sleep(0.5)
            
            r_text = (
                "With respect, My Lord. The respondent submits that Article 14 permits reasonable classification. "
                "The legislature holds the authority to draw categorizations based on historical differences, "
                "supported by the Supreme Court ruling in 2018 SC 495."
            )
            words = r_text.split(" ")
            for i in range(0, len(words), 4):
                chunk = " ".join(words[i:i+4]) + " "
                yield make_sse("argument_chunk", {"chunk": chunk})
                await asyncio.sleep(0.1)
                
            # Save Respondent counter event
            evt_2_id = str(uuid.uuid4())
            evt_2 = TranscriptEvent(
                id=evt_2_id,
                session_id=session_id,
                speaker="Opposing Counsel (AI Agent)",
                role="respondent",
                text=r_text,
                event_type="argument",
                created_at=datetime.utcnow()
            )
            db.add(evt_2)
            await db.commit()
            
            # Send score update
            yield make_sse("score_update", {"petitioner": 80, "respondent": 82})
            await asyncio.sleep(0.5)

            # --- DEBATE TURN 3 (Respondent Clarification Card) ---
            # Opposing Counsel requests clarification. Show card on LEFT.
            card_data = {
                "id": "card-1",
                "question": "Which category of statutory exceptions does the Petitioner claim is most arbitrary?",
                "options": [
                    "Category A: Demographics-based exclusions",
                    "Category B: Institutional exemptions",
                    "Category C: Retrospective applicability clauses"
                ],
                "side": "left",
                "answered": False
            }
            
            yield make_sse("clarification_card", card_data)
            
            # Save Card event in DB
            evt_3_id = "card-1"
            evt_3 = TranscriptEvent(
                id=evt_3_id,
                session_id=session_id,
                speaker="Opposing Counsel (AI Agent)",
                role="respondent",
                text="The Petitioner claims the classification is arbitrary. Can Counsel clarify which category of exceptions they are targeting?",
                event_type="clarification_request",
                card_data=card_data,
                created_at=datetime.utcnow()
            )
            db.add(evt_3)
            await db.commit()
            
        elif events_count == 4:
            # We are after the first card is answered.
            # --- DEBATE TURN 4 (Bench Interjection Card) ---
            # Bench requests clarification. Show card on RIGHT.
            yield make_sse("turn_started", {"role": "bench", "speaker": "Bench / Presiding Judge"})
            await asyncio.sleep(0.5)
            
            b_text = "Counsel, if you target Category A exclusions, how do you reconcile this with the Supreme Court precedent in Maharashtra v. Rao (2018 SC 495)?"
            words = b_text.split(" ")
            for i in range(0, len(words), 4):
                chunk = " ".join(words[i:i+4]) + " "
                yield make_sse("argument_chunk", {"chunk": chunk})
                await asyncio.sleep(0.1)
                
            card_data = {
                "id": "card-2",
                "question": "How does the Petitioner reconcile Category A exclusions with the 2018 precedent?",
                "options": [
                    "Differentiate our case on the basis of altered factual circumstances",
                    "Challenge the applicability of the 2018 ruling under recent amendments",
                    "Concede partial overlap but argue for narrow reading of the precedent"
                ],
                "side": "right",
                "answered": False
            }
            
            yield make_sse("clarification_card", card_data)
            
            evt_4_id = "card-2"
            evt_4 = TranscriptEvent(
                id=evt_4_id,
                session_id=session_id,
                speaker="Bench / Presiding Judge",
                role="bench",
                text=b_text,
                event_type="clarification_request",
                card_data=card_data,
                created_at=datetime.utcnow()
            )
            db.add(evt_4)
            await db.commit()
            
        elif events_count == 6:
            # We are after the second card is answered.
            # --- DEBATE TURN 5 (Respondent Final Stand) ---
            yield make_sse("turn_started", {"role": "respondent", "speaker": "Opposing Counsel (AI Agent)"})
            await asyncio.sleep(0.5)
            
            r2_text = (
                "Even if the 2021 statutory amendments apply, Category A remains reasonable. "
                "Petitioner fails to show that the classification results in hostile discrimination."
            )
            words = r2_text.split(" ")
            for i in range(0, len(words), 4):
                chunk = " ".join(words[i:i+4]) + " "
                yield make_sse("argument_chunk", {"chunk": chunk})
                await asyncio.sleep(0.1)
                
            evt_5_id = str(uuid.uuid4())
            evt_5 = TranscriptEvent(
                id=evt_5_id,
                session_id=session_id,
                speaker="Opposing Counsel (AI Agent)",
                role="respondent",
                text=r2_text,
                event_type="argument",
                created_at=datetime.utcnow()
            )
            db.add(evt_5)
            await db.commit()
            
            # --- DEBATE TURN 6 (Bench Concluding Statement) ---
            yield make_sse("turn_started", {"role": "bench", "speaker": "Bench / Presiding Judge"})
            await asyncio.sleep(0.5)
            
            b2_text = "The arguments are noted. The tribunal will now compile the final analysis and verdict logs."
            words = b2_text.split(" ")
            for i in range(0, len(words), 4):
                chunk = " ".join(words[i:i+4]) + " "
                yield make_sse("argument_chunk", {"chunk": chunk})
                await asyncio.sleep(0.1)
                
            evt_6_id = str(uuid.uuid4())
            evt_6 = TranscriptEvent(
                id=evt_6_id,
                session_id=session_id,
                speaker="Bench / Presiding Judge",
                role="bench",
                text=b2_text,
                event_type="argument",
                created_at=datetime.utcnow()
            )
            db.add(evt_6)
            await db.commit()
            
            # Final score update and verdict indicator
            yield make_sse("score_update", {"petitioner": 90, "respondent": 85})
            await asyncio.sleep(0.5)
            yield make_sse("verdict_ready", {"ready": True})
            await asyncio.sleep(0.5)

        # Done event
        yield "event: done\ndata: {}\n\n"
