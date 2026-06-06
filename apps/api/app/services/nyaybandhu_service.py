import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import NyaybandhuSession, TranscriptEvent
from app.core.rbac import DEFAULT_REVIEW_ROLES, RequestActor, has_permission

class NyaybandhuService:
    @staticmethod
    def _normalize_access_config(config: Optional[dict], actor: RequestActor) -> dict:
        access_config: dict[str, Any] = dict(config or {})
        rbac_config = access_config.get("rbac") if isinstance(access_config.get("rbac"), dict) else {}

        assigned_roles = rbac_config.get("assigned_roles")
        if not isinstance(assigned_roles, list) or not assigned_roles:
            assigned_roles = list(DEFAULT_REVIEW_ROLES)
        else:
            assigned_roles = [role for role in assigned_roles if role in DEFAULT_REVIEW_ROLES]
            if not assigned_roles:
                assigned_roles = list(DEFAULT_REVIEW_ROLES)

        access_config["rbac"] = {
            "creator_user_id": actor.user_id,
            "creator_role": actor.role,
            "assigned_roles": assigned_roles,
        }
        return access_config

    @staticmethod
    def analyze_real_life_case(description: str, title: str) -> dict:
        desc_lower = description.lower() if description else ""
        title_lower = title.lower() if title else ""
        combined = f"{title_lower} {desc_lower}"
        
        # Clean safety marker if present
        clean_desc = description.replace("[SAFETY_ALERT: TRUE]\n", "").replace("[SAFETY_ALERT: TRUE]", "") if description else ""
        facts = [clean_desc.strip()] if clean_desc.strip() else ["No details provided."]

        # 1. Classify matter-type
        matter_type = "other"
        ambiguity_detected = False
        
        # Define keywords for taxonomy
        keywords_map = {
            "landlord-tenant": ["rent", "landlord", "tenant", "flat", "lease", "owner", "deposit", "eviction", "roommate", "sublet", "housing", "renting"],
            "employment/salary dispute": ["salary", "employer", "employee", "wage", "job", "terminate", "fired", "provident", "boss", "salary slip", "workplace", "payroll"],
            "domestic violence": ["domestic violence", "husband", "wife", "marriage abuse", "beat", "hit", "abuse", "assaulted", "slapped", "physical violence"],
            "maintenance": ["maintenance", "alimony", "spousal support", "child support"],
            "divorce/family dispute": ["divorce", "family dispute", "marital", "separation", "estranged", "dowry"],
            "child custody/visitation": ["custody", "visitation", "guardianship", "child care"],
            "consumer complaint": ["consumer", "defective", "refund", "shop", "bought", "service delay", "damaged product", "warranty", "merchant", "fraudulent charge", "invoice"],
            "property/possession": ["property", "possession", "land", "plot", "house", "encroach", "trespass", "registry", "partition", "real estate"],
            "cyber abuse": ["cyber", "online", "fraud", "hacked", "facebook", "whatsapp", "stalked online", "phishing", "identity theft", "harassed online"],
            "cheque/payment dispute": ["cheque", "check", "bounce", "payment", "unpaid loan", "due amount", "debt recovery"],
            "contract dispute": ["contract", "agreement", "terms", "signed", "breach", "nda", "service level"],
            "police complaint/FIR-related": ["police", "fir", "complaint", "arrest", "station", "cop", "constable", "investigation"],
            "loan/debt harassment": ["loan", "debt", "recovery agent", "harass", "bank recovery", "loan app", "extortion"]
        }

        # Check keyword matches
        matches = []
        for m_type, keywords in keywords_map.items():
            if any(k in combined for k in keywords):
                matches.append(m_type)

        if not matches:
            matter_type = "other"
            ambiguity_detected = True
        elif len(matches) == 1:
            matter_type = matches[0]
        else:
            # Multi-match: prioritize more severe/specific matters
            priority_list = [
                "domestic violence", "child custody/visitation", "loan/debt harassment", 
                "cyber abuse", "police complaint/FIR-related", "landlord-tenant", 
                "employment/salary dispute", "property/possession", "cheque/payment dispute", 
                "contract dispute", "divorce/family dispute", "maintenance", "consumer complaint"
            ]
            matched_priority = [m for m in priority_list if m in matches]
            if matched_priority:
                matter_type = matched_priority[0]
            else:
                matter_type = matches[0]

        # 2. Determine safety flag
        safety_keywords = [
            "violence", "abuse", "stalk", "harm", "threat", "kill", "beat", "hit", "assault", 
            "weapon", "harassed", "harassment", "suicide", "self-harm", "danger", 
            "child danger", "physical abuse", "sexual abuse", "coercion"
        ]
        explicit_safety = "[safety_alert: true]" in desc_lower or "[safety_alert: true]" in title_lower
        has_safety_keywords = any(word in combined for word in safety_keywords)
        safety_flag = has_safety_keywords or explicit_safety

        # 3. Determine urgency level
        # High urgency: immediate safety, eviction/unsafe shelter, medical emergency, child risk, police coercion, likely evidence destruction
        high_urgency_indicators = [
            "evict", "throw out", "thrown out", "lock out", "locked out", "homeless", "unsafe shelter",
            "hospital", "injury", "bleeding", "wound", "doctor", "police coercion", "police threat",
            "arrest", "forced to sign", "lockup", "delete", "destroy", "wipe", "erase", "child safety",
            "kidnap", "threat to life", "kill"
        ]
        
        is_high_urgency = (
            safety_flag or 
            any(ind in combined for ind in high_urgency_indicators)
        )
        
        # Medium urgency: active financial dispute, deadlines, minor/non-physical harassment
        medium_urgency_indicators = [
            "salary", "wage", "payment", "deposit", "money", "cheque", "unpaid", "due", "court date",
            "notice period", "deadline", "hearing", "days left", "harass", "calls"
        ]
        is_medium_urgency = any(ind in combined for ind in medium_urgency_indicators)

        if is_high_urgency:
            urgency_level = "high"
        elif is_medium_urgency:
            urgency_level = "medium"
        else:
            urgency_level = "low"

        # 4. Generate plain-English, supportive guidance components
        # Timeline
        timeline = []
        timeline_keywords = ["date", "month", "year", "week", "yesterday", "ago", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
        if any(tk in combined for tk in timeline_keywords):
            timeline.append({
                "date": "Approximate date of the incident",
                "event": "The main event described in your story occurred.",
                "certainty": "approximate"
            })
        else:
            timeline.append({
                "date": "Unknown date",
                "event": "The dispute or incident occurred.",
                "certainty": "unknown"
            })

        # People involved
        people_involved = [
            {"name": "You", "role": "Affected Party", "status": "confirmed"}
        ]
        other_party_role = "Opposing Party"
        if matter_type == "landlord-tenant":
            other_party_role = "Landlord / Owner"
        elif matter_type == "employment/salary dispute":
            other_party_role = "Employer / HR Manager"
        elif matter_type == "consumer complaint":
            other_party_role = "Seller / Service Provider"
        elif matter_type == "domestic violence":
            other_party_role = "Spouse / Relative"
        
        people_involved.append({"name": "Other Party", "role": other_party_role, "status": "confirmed"})

        # Relief sought
        relief_sought = []
        if matter_type == "landlord-tenant":
            relief_sought.append("Refund of the security deposit")
            relief_sought.append("Quiet enjoyment of the rented property or proper notice period")
        elif matter_type == "employment/salary dispute":
            relief_sought.append("Release of pending salary and wages")
            relief_sought.append("Proper termination notice or severance pay")
        elif matter_type == "consumer complaint":
            relief_sought.append("Refund or replacement for the defective product/service")
        elif matter_type == "domestic violence":
            relief_sought.append("Safety protection and legal separation/maintenance")
        elif matter_type == "cheque/payment dispute":
            relief_sought.append("Recovery of outstanding financial dues")
        else:
            relief_sought.append("Resolution of the dispute and fair treatment under the law")

        # Documents available
        docs = []
        if any(w in combined for w in ["agreement", "contract", "lease"]):
            docs.append({
                "document": "Written Agreement/Lease", 
                "status": "available", 
                "relevance": "Provides the formal terms and conditions agreed by both parties."
            })
        else:
            docs.append({
                "document": "Written Agreement/Lease", 
                "status": "missing", 
                "relevance": "Crucial to establish the terms of transaction; verbal terms are harder to verify."
            })

        if any(w in combined for w in ["receipt", "bill", "invoice", "payment", "bank statement", "transaction"]):
            docs.append({
                "document": "Payment Receipts / Bank Statements", 
                "status": "available", 
                "relevance": "Confirms the financial transactions occurred as claimed."
            })
        else:
            docs.append({
                "document": "Payment Receipts / Bank Statements", 
                "status": "mentioned_not_shared", 
                "relevance": "Needed to verify the exact amounts paid and dates of transfer."
            })

        if any(w in combined for w in ["whatsapp", "chat", "email", "messages", "text"]):
            docs.append({
                "document": "Chat History / Emails", 
                "status": "available", 
                "relevance": "Shows the communication history and any admissions or disputes between both parties."
            })
        else:
            docs.append({
                "document": "Chat History / Emails", 
                "status": "missing", 
                "relevance": "Helps establish that you raised the issue with the other party."
            })

        # Risks
        risks = []
        if safety_flag:
            risks.append({
                "risk": "Risk of personal safety or physical harm",
                "level": "high",
                "reason": "The description details situations involving abuse, physical danger, or threats."
            })
        elif urgency_level == "high":
            risks.append({
                "risk": "Risk of immediate displacement or loss of shelter",
                "level": "high",
                "reason": "Eviction threats or lockout can lead to lack of secure housing."
            })
        
        if matter_type in ["landlord-tenant", "cheque/payment dispute", "employment/salary dispute", "consumer complaint"]:
            risks.append({
                "risk": "Financial loss or non-recovery of funds",
                "level": "medium",
                "reason": "The other side may continue to withhold funds or ignore claims without a formal demand."
            })
        else:
            risks.append({
                "risk": "Unresolved dispute causing ongoing stress",
                "level": "medium",
                "reason": "Lack of communication or resolution prolongs the conflict."
            })

        # Issues
        issues = []
        if matter_type == "landlord-tenant":
            issues.append({"issue": "Withholding of security deposit without a breakdown of damages", "confidence": "high", "reason": "Landlords generally cannot deduct for normal wear and tear and must justify withholdings."})
        elif matter_type == "employment/salary dispute":
            issues.append({"issue": "Non-payment of wages for completed work", "confidence": "high", "reason": "Employers are legally bound to pay for services rendered under labor laws."})
        elif matter_type == "domestic violence":
            issues.append({"issue": "Protection and support under domestic violence laws", "confidence": "high", "reason": "Protection of Women from Domestic Violence Act covers emotional, physical, and financial abuse."})
        elif matter_type == "consumer complaint":
            issues.append({"issue": "Defective product or service failure under Consumer Protection Act", "confidence": "high", "reason": "Consumers have a right to get refunds or replacements for faulty items."})
        elif matter_type == "cyber abuse":
            issues.append({"issue": "Harassment or fraud through digital channels", "confidence": "high", "reason": "Information Technology Act covers cyber crimes, online abuse, and financial identity fraud."})
        else:
            issues.append({"issue": "Breach of verbal or written understanding", "confidence": "medium", "reason": "The other party failed to honor the terms of agreement or transaction."})

        # Strengths & Weaknesses
        strengths = []
        weaknesses = []

        # Civil / Contractual / Financial matter types
        civil_contractual = [
            "landlord-tenant", "employment/salary dispute", "consumer complaint", 
            "cheque/payment dispute", "contract dispute", "property/possession", 
            "maintenance", "divorce/family dispute", "child custody/visitation", "other"
        ]

        if matter_type in civil_contractual:
            if any(w in combined for w in ["agreement", "contract", "lease"]):
                strengths.append("You have a written agreement, which clarifies rights and duties.")
            else:
                strengths.append("Your explanation provides a clear basis for a claim, though we need messages to support it.")
                weaknesses.append("Lack of a signed, written agreement or service contract makes proving agreed terms more challenging.")
            
            if any(w in combined for w in ["receipt", "bill", "invoice", "payment", "bank statement", "transaction"]):
                strengths.append("You have proof of payment or bank transfer records.")
            elif matter_type in ["landlord-tenant", "employment/salary dispute", "consumer complaint", "cheque/payment dispute"]:
                weaknesses.append("Lack of clear receipts or invoices makes verifying transaction amounts difficult.")

            if any(w in combined for w in ["whatsapp", "chat", "email", "messages", "text"]):
                strengths.append("You have chat or email history showing you requested resolution.")
            
            if matter_type == "landlord-tenant" and not "photo" in combined:
                weaknesses.append("No photos of the property's condition at move-out to counter claims of damages.")
        
        elif matter_type == "domestic violence":
            strengths.append("You have detailed personal testimony of the incidents.")
            if any(w in combined for w in ["whatsapp", "chat", "email", "messages", "text", "recording", "photo"]):
                strengths.append("You have messages, recordings, or photos documenting the threat or abuse.")
            else:
                weaknesses.append("Lack of physical evidence or independent witness statements might make it harder to document the abuse officially.")
            
        elif matter_type == "cyber abuse":
            if any(w in combined for w in ["whatsapp", "chat", "email", "messages", "text", "screenshot"]):
                strengths.append("You have screenshots or digital copies of the abusive messages or transactions.")
            else:
                weaknesses.append("Without saved digital evidence (screenshots, links, or logs), cyber harassment is difficult to prove.")
            
        elif matter_type == "police complaint/FIR-related":
            if any(w in combined for w in ["fir", "copy", "complaint", "written"]):
                strengths.append("You have a copy of the written complaint or FIR filed with the police.")
            else:
                weaknesses.append("Without a written copy of the filed complaint or FIR number, tracking the progress of the case is difficult.")
            
        elif matter_type == "loan/debt harassment":
            if any(w in combined for w in ["call", "recording", "whatsapp", "message", "agent"]):
                strengths.append("You have records or recordings of the harassing messages and calls.")
            else:
                weaknesses.append("Documenting the frequency and nature of the recovery agents' calls is needed to prove harassment.")

        # Ensure we always have at least one strength and weakness to avoid blank fields in the report
        if not strengths:
            strengths.append("You have shared a clear recount of the situation to begin organizing your case.")
        if not weaknesses:
            weaknesses.append("Gathering more supporting details or confirmation from other parties would help strengthen the case.")

        # Missing Information / Ambiguity
        missing_info = []
        if ambiguity_detected:
            missing_info.append("The description does not clearly indicate what kind of legal relationship or transaction was involved.")
        if not "date" in combined:
            missing_info.append("The exact dates when the issue arose or when agreements were signed are not specified.")
        if matter_type in civil_contractual and not any(w in combined for w in ["agreement", "contract", "lease"]):
            missing_info.append("Information on whether there is any written document or if it was entirely verbal.")
        if not missing_info:
            missing_info.append("Specific responses or defense from the other party.")

        # Recommended Next Steps
        next_steps = []
        if safety_flag:
            next_steps.append("Prioritize your personal safety immediately by moving to a secure environment.")
            next_steps.append("Call the national emergency helpline (112) or the dedicated women's helpline (1091) if you feel threatened.")
        elif urgency_level == "high":
            next_steps.append("Consult a lawyer or legal aid volunteer immediately regarding the urgent lockout or eviction risk.")
        
        next_steps.append("Organize all written agreements, payment receipts, and text communications in one folder.")
        next_steps.append("Draft a polite but formal written notice listing your claims and a 15-day timeline for resolution.")
        next_steps.append("Reach out to your local District Legal Services Authority (DLSA) for free assistance if you cannot afford a lawyer.")

        # Follow-up Questions (max 5)
        questions = []
        if matter_type == "landlord-tenant":
            questions.append("Do you have photos or videos of the rented space taken around the time you moved out?")
            questions.append("What is the exact security deposit amount written in your lease agreement?")
            questions.append("Has the landlord provided a written list of deductions or damages?")
        elif matter_type == "employment/salary dispute":
            questions.append("Do you have salary slips, bank statements, or offer letters to prove your monthly pay?")
            questions.append("Was your employment terminated in writing, or did the employer simply stop communication?")
            questions.append("What is the exact amount of salary or wages currently unpaid?")
        elif matter_type == "consumer complaint":
            questions.append("Do you have the purchase invoice, receipt, or service warranty details?")
            questions.append("Have you raised a formal complaint with the customer support or merchant?")
        elif safety_flag:
            questions.append("Are you currently in a safe place, or do you need assistance finding temporary shelter?")
            questions.append("Have you reported these threats or incidents to the local police or filed an FIR?")
        else:
            questions.append("Is there any written contract, invoice, or receipt for this transaction?")
            questions.append("On what date did this issue or dispute first begin?")

        # Limit to max 5 questions
        questions = questions[:5]

        # Generate summary text
        summary_text = f"This case review summarizes a {matter_type} issue. "
        if strengths:
            summary_text += f"A key strength is: {strengths[0]} "
        if weaknesses:
            summary_text += f"A main challenge is: {weaknesses[0]} "
        summary_text += "We suggest following the recommended next steps below and collecting relevant documents."

        return {
            "matter_type": matter_type,
            "title": f"Review: {title}",
            "summary": summary_text,
            "facts": facts,
            "timeline": timeline,
            "people_involved": people_involved,
            "relief_sought": relief_sought,
            "documents_available": docs,
            "immediate_risks": risks,
            "legal_issues_preliminary": issues,
            "strengths": strengths,
            "weaknesses_or_gaps": weaknesses,
            "missing_information": missing_info,
            "recommended_next_steps": next_steps,
            "follow_up_questions": questions,
            "safety_flag": safety_flag,
            "urgency_level": urgency_level,
            "disclaimer": "This is a preliminary, fact-based legal information output and not a final legal opinion. A lawyer or authorised legal aid professional should verify the facts, documents, procedure, limitation, and applicable law."
        }

    @staticmethod
    async def create_session(db: AsyncSession, title: str, description: Optional[str], mode: str, opposing_counsel_strategy: str, config: Optional[dict] = None, actor: Optional[RequestActor] = None) -> NyaybandhuSession:
        session_id = str(uuid.uuid4())
        access_actor = actor or RequestActor(user_id="anonymous", role="normal_user")
        session = NyaybandhuSession(
            id=session_id,
            title=title,
            description=description,
            mode=mode,
            opposing_counsel_strategy=opposing_counsel_strategy,
            status="active",
            created_at=datetime.utcnow(),
            config=NyaybandhuService._normalize_access_config(config, access_actor),
        )
        db.add(session)
        
        # Insert initial startup event
        is_real = mode == "real-life"
        startup_event = TranscriptEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            speaker="Bench / Presiding Judge" if not is_real else "Guide",
            role="bench",
            text="The tribunal is now convened. We will examine the statutory challenge to Clause 4. Counsel for the Petitioner may present opening claims." if not is_real else "Welcome to your case review workspace. I will help you look at both sides of your issue in plain English. Let's start by reviewing the strengths and challenges of your case.",
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
    async def list_history(db: AsyncSession, actor: RequestActor) -> List[NyaybandhuSession]:
        result = await db.execute(select(NyaybandhuSession).order_by(NyaybandhuSession.created_at.desc()))
        sessions = list(result.scalars().all())

        if actor.role == "normal_user":
            return [session for session in sessions if (session.config or {}).get("rbac", {}).get("creator_user_id") == actor.user_id]

        return [
            session
            for session in sessions
            if actor.role in ((session.config or {}).get("rbac", {}).get("assigned_roles") or list(DEFAULT_REVIEW_ROLES))
            or (session.config or {}).get("rbac", {}).get("creator_user_id") == actor.user_id
        ]

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
        
        # Determine internal card ID from card_data JSON for score assignment
        card_internal_id = "card-1"
        if card_event and card_event.card_data:
            card_internal_id = card_event.card_data.get("id", "card-1")
        
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
            score_delta={"petitioner": 88, "respondent": 75} if card_internal_id == "card-1" or card_id == "card-1" else {"petitioner": 92, "respondent": 78},
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

        config = dict(session.config or {})
        rbac_config = dict(config.get("rbac") or {})
        if rbac_config.get("creator_role") == "lawyer":
            rbac_config["lawyer_review_complete"] = True
        config["rbac"] = rbac_config
        session.config = config
        
        if session.mode == "real-life":
            analysis = NyaybandhuService.analyze_real_life_case(session.description, session.title)
            session.summary = json.dumps(analysis)
            
            # Set verdict label based on safety & strengths
            if analysis["safety_flag"]:
                session.verdict = "Urgent help needed. Safety concerns or immediate danger detected. Please check helplines immediately."
            else:
                session.verdict = "Strong enough to explore further. You have key points supporting your claim."
        else:
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

    @staticmethod
    async def add_intern_note(db: AsyncSession, session_id: str, note: str, actor: RequestActor) -> NyaybandhuSession:
        result = await db.execute(select(NyaybandhuSession).where(NyaybandhuSession.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found")

        config = dict(session.config or {})
        rbac_config = dict(config.get("rbac") or {})
        intern_notes = list(rbac_config.get("intern_notes") or [])
        intern_notes.append(
            {
                "id": str(uuid.uuid4()),
                "note": note,
                "author_role": actor.role,
                "author_user_id": actor.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }
        )
        rbac_config["intern_notes"] = intern_notes
        config["rbac"] = rbac_config
        session.config = config

        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def mark_lawyer_review_complete(db: AsyncSession, session_id: str, summary: Optional[str], actor: RequestActor) -> NyaybandhuSession:
        result = await db.execute(select(NyaybandhuSession).where(NyaybandhuSession.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found")

        session = await NyaybandhuService.finalize_session(db, session_id)
        config = dict(session.config or {})
        rbac_config = dict(config.get("rbac") or {})
        rbac_config["lawyer_review_complete"] = True
        rbac_config["lawyer_review_completed_by"] = actor.user_id
        rbac_config["lawyer_review_completed_at"] = datetime.utcnow().isoformat()
        if summary:
            rbac_config["lawyer_review_summary"] = summary
        config["rbac"] = rbac_config
        session.config = config

        await db.commit()
        await db.refresh(session)
        return session

    @classmethod
    async def generate_debate_stream(cls, db: AsyncSession, session_id: str) -> AsyncGenerator[str, None]:
        # Fetch session details
        session = await cls.get_session(db, session_id)
        is_real_life = session.mode == "real-life" if session else False
        
        # 1. Fetch current events to see where we are in the flow
        events = await cls.get_events(db, session_id)
        events_count = len(events)
        
        # Helper to format SSE strings
        def make_sse(event_name: str, data: dict) -> str:
            return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"

        if is_real_life:
            # --- REAL LIFE FLOW ---
            if events_count <= 1:
                # Turn 1: Support Review (role: petitioner)
                yield make_sse("turn_started", {"role": "petitioner", "speaker": "Support Review"})
                await asyncio.sleep(0.5)
                p_text = (
                    "I have reviewed the details you shared. Based on the facts, you have a valid concern. "
                    "For example, if you are facing a deposit dispute or salary delay, the other side cannot withhold payments "
                    "without a valid legal reason. We should explore what records you have to support your claim."
                )
                words = p_text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.1)
                
                evt_1 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Support Review",
                    role="petitioner",
                    text=p_text,
                    event_type="argument",
                    created_at=datetime.utcnow()
                )
                db.add(evt_1)
                await db.commit()
                
                # Turn 2: Challenge Review (role: respondent)
                yield make_sse("turn_started", {"role": "respondent", "speaker": "Challenge Review"})
                await asyncio.sleep(0.5)
                r_text = (
                    "While we want to support your claim, we must look at the challenges. "
                    "The other side will likely argue they had a right to withhold payment or deduct expenses. "
                    "We need to check if there is a written contract, agreement, or communication showing the agreed terms."
                )
                words = r_text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.1)
                    
                evt_2 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Challenge Review",
                    role="respondent",
                    text=r_text,
                    event_type="argument",
                    created_at=datetime.utcnow()
                )
                db.add(evt_2)
                await db.commit()
                
                # Turn 3: Challenge Review Clarification Card
                card_data = {
                    "id": "card-1",
                    "question": "Do you have a written agreement, contract, or payment receipts?",
                    "options": [
                        "Yes, I have a signed written agreement and receipts.",
                        "I only have messages/emails and bank transactions.",
                        "No, it was a verbal agreement with no written records."
                    ],
                    "side": "left",
                    "answered": False
                }
                yield make_sse("clarification_card", card_data)
                
                evt_3 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Challenge Review",
                    role="respondent",
                    text="The other side may challenge our claims. Can you clarify if you have a written agreement or receipts?",
                    event_type="clarification_request",
                    card_data=card_data,
                    created_at=datetime.utcnow()
                )
                db.add(evt_3)
                await db.commit()
                
            elif events_count == 4:
                # Turn 4: Guide (role: bench)
                yield make_sse("turn_started", {"role": "bench", "speaker": "Guide"})
                await asyncio.sleep(0.5)
                b_text = (
                    "Thank you for sharing. Having messages, emails, or bank statements is very helpful to establish "
                    "a record of your arrangement, even without a formal contract. Let's look at when this happened to check the timeline."
                )
                words = b_text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.1)
                    
                card_data = {
                    "id": "card-2",
                    "question": "When did this issue start, and have you sent any notice?",
                    "options": [
                        "It started recently, and I sent a written message/email.",
                        "It has been ongoing for months, no notice sent yet.",
                        "It happened a long time ago, and we are in active dispute."
                    ],
                    "side": "right",
                    "answered": False
                }
                yield make_sse("clarification_card", card_data)
                
                evt_4 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Guide",
                    role="bench",
                    text=b_text,
                    event_type="clarification_request",
                    card_data=card_data,
                    created_at=datetime.utcnow()
                )
                db.add(evt_4)
                await db.commit()
                
            elif events_count == 6:
                # Turn 5: Challenge Review (role: respondent)
                yield make_sse("turn_started", {"role": "respondent", "speaker": "Challenge Review"})
                await asyncio.sleep(0.5)
                r2_text = (
                    "A clear timeline helps verify if your claim is within the standard legal time limits. "
                    "If you have sent a written message or notice, that shows you made an effort to resolve it. "
                    "We must ensure we have a record of all communications."
                )
                words = r2_text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.1)
                    
                evt_5 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Challenge Review",
                    role="respondent",
                    text=r2_text,
                    event_type="argument",
                    created_at=datetime.utcnow()
                )
                db.add(evt_5)
                await db.commit()
                
                # Turn 6: Guide (role: bench)
                yield make_sse("turn_started", {"role": "bench", "speaker": "Guide"})
                await asyncio.sleep(0.5)
                b2_text = "All details have been recorded. I will now compile these facts and prepare your Guidance Report with practical next steps."
                words = b2_text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.1)
                    
                evt_6 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Guide",
                    role="bench",
                    text=b2_text,
                    event_type="argument",
                    created_at=datetime.utcnow()
                )
                db.add(evt_6)
                await db.commit()
                
                # Final score update and verdict indicator
                yield make_sse("score_update", {"petitioner": 75, "respondent": 65})
                await asyncio.sleep(0.5)
                yield make_sse("verdict_ready", {"ready": True})
                await asyncio.sleep(0.5)
        else:
            # --- COURTROOM SIMULATION PRACTICE FLOW ---
            if events_count <= 1:
                # --- START DEBATE TURN 1 (Petitioner opening) ---
                yield make_sse("turn_started", {"role": "petitioner", "speaker": "Petitioner Counsel (System)"})
                await asyncio.sleep(0.5)
                
                p_text = (
                    "Obliged, My Lord. We submit that Clause 4 imposes an arbitrary classification violating "
                    "the fundamental equality principles guaranteed under Article 14. The distinction drawn is neither "
                    "rational nor has any nexus to the statutory objective."
                )
                words = p_text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.1)
                    
                evt_1 = TranscriptEvent(
                    id=str(uuid.uuid4()),
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
                    
                evt_2 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Opposing Counsel (AI Agent)",
                    role="respondent",
                    text=r_text,
                    event_type="argument",
                    created_at=datetime.utcnow()
                )
                db.add(evt_2)
                await db.commit()
                
                yield make_sse("score_update", {"petitioner": 80, "respondent": 82})
                await asyncio.sleep(0.5)
                
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
                
                evt_3 = TranscriptEvent(
                    id=str(uuid.uuid4()),
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
                
                evt_4 = TranscriptEvent(
                    id=str(uuid.uuid4()),
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
                    
                evt_5 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Opposing Counsel (AI Agent)",
                    role="respondent",
                    text=r2_text,
                    event_type="argument",
                    created_at=datetime.utcnow()
                )
                db.add(evt_5)
                await db.commit()
                
                yield make_sse("turn_started", {"role": "bench", "speaker": "Bench / Presiding Judge"})
                await asyncio.sleep(0.5)
                
                b2_text = "The arguments are noted. The tribunal will now compile the final analysis and verdict logs."
                words = b2_text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.1)
                    
                evt_6 = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker="Bench / Presiding Judge",
                    role="bench",
                    text=b2_text,
                    event_type="argument",
                    created_at=datetime.utcnow()
                )
                db.add(evt_6)
                await db.commit()
                
                yield make_sse("score_update", {"petitioner": 90, "respondent": 85})
                await asyncio.sleep(0.5)
                yield make_sse("verdict_ready", {"ready": True})
                await asyncio.sleep(0.5)

        # Done event
        yield "event: done\ndata: {}\n\n"
