import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import NyaybandhuSession, TranscriptEvent
from app.core.rbac import DEFAULT_REVIEW_ROLES, RequestActor, has_permission

CASE_ALIGNED_RESOURCES = {
    "landlord-tenant": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have a signed lease agreement and proof of deposit payment?",
            "options": [
                "Yes, I have a signed agreement and deposit receipts.",
                "I have bank statements showing the deposit payment, but the lease is expired/verbal.",
                "No, it was a verbal tenancy and we paid in cash without receipts."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Has the landlord provided any written list of damages or reason for withholding?",
            "options": [
                "No, they blocked me or refused to give any explanation.",
                "Yes, they claim there are damages, but they are normal wear and tear.",
                "They verbally refused to refund, citing utility bills or minor cleaning issues."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "A landlord cannot arbitrarily withhold the security deposit.",
            "The tenant completed the tenancy and handed over the flat clean.",
            "Deductions for normal wear and tear are illegal under rental laws.",
            "The bank statement clearly proves the security deposit was paid in full.",
            "The tenant is entitled to a full refund within the statutory timeframe.",
            "Landlord's claims of property damage must be backed by move-in/move-out reports.",
            "The tenant paid all rents and bills on time without default.",
            "A formal notice will hold the landlord accountable for the withheld sum."
        ],
        "challenge_args": [
            "The landlord has a right to inspect the property for tenant-caused damages.",
            "Tenants often claim normal wear and tear for actual damages.",
            "Rental agreement clauses may allow deductions for painting or cleaning.",
            "If the tenant did not give proper notice, security deposit may be forfeited.",
            "Verbal agreements make it hard to verify terms of refund.",
            "Without a formal move-out inspection document, proving condition is hard.",
            "If there are unpaid utility bills, the landlord can deduct them.",
            "Sending a legal notice might lead to a counter-suit for damages."
        ]
    },
    "employment/salary dispute": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have an official appointment/offer letter or pay slips?",
            "options": [
                "Yes, I have an offer letter, pay slips, and bank records.",
                "I have emails/chats discussing my salary and job, but no official offer letter.",
                "No, it was an informal/contractual job with no written agreements."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Did the employer provide a termination notice or reason for non-payment?",
            "options": [
                "No, they stopped paying and blocked communication/ignored messages.",
                "They claimed financial difficulties or company losses.",
                "They alleged poor performance or breach of company policy."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "An employer is legally bound to pay for services rendered under labor laws.",
            "Non-payment of wages violates standard employment contracts.",
            "The employee has records of working days and completed tasks.",
            "Arbitrary salary deductions without notice are unlawful.",
            "The company is responsible for paying severance if terminated without notice.",
            "Bank statement shows the regular payment stopped abruptly.",
            "Official communications support the claim of active employment.",
            "A labor commissioner complaint is a viable option if unpaid."
        ],
        "challenge_args": [
            "The employer may claim the employee was terminated for cause/poor performance.",
            "If there is no written contract, proving employment status is harder.",
            "The company might claim the worker agreed to a salary cut or deferral.",
            "If the employee resigned, notice period terms must be checked.",
            "Provident fund or tax deductions must be verified for accuracy.",
            "The employer may cite lack of timesheet logs or work proof.",
            "Proving working hours in informal setups is challenging.",
            "The other side may claim the worker caused damage to company assets."
        ]
    },
    "domestic violence": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have any records or evidence of the abusive incidents or threats?",
            "options": [
                "Yes, I have photos, doctor reports, or recorded calls/messages.",
                "I only have chat messages/emails showing threats, but no physical proof.",
                "No, the abuse was verbal/physical with no digital or medical records."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Have you reported these incidents to the police or a women's protection cell?",
            "options": [
                "No, I haven't reported it yet due to fear or hope of resolution.",
                "Yes, I filed a police complaint/FIR or spoke to a protection officer.",
                "I approached a local community group or relative to mediate."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "Your safety and protection under domestic violence laws are paramount.",
            "The law provides safety orders and protection from dispossession.",
            "Threats and physical abuse are criminal offenses.",
            "A court can grant residency rights in the shared household.",
            "Medical records or photos provide strong evidence of harm.",
            "Mental and emotional cruelty are recognized under the DV Act.",
            "Interim maintenance can be sought for safety and child support.",
            "Reaching out to a protection officer is a highly recommended step."
        ],
        "challenge_args": [
            "The other side may deny all allegations and claim they are fabricated.",
            "Without medical reports, proving physical injury is difficult.",
            "Lack of independent witnesses makes it a word-against-word situation.",
            "Proving emotional abuse requires consistent documentation.",
            "The other party may claim the conflict was a normal marital dispute.",
            "They might allege you left the home voluntarily without reason.",
            "Counter-claims of harassment or cruelty may be raised.",
            "Proving the frequency of threats requires saved digital logs."
        ]
    },
    "consumer complaint": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have the purchase invoice/receipt and active warranty details?",
            "options": [
                "Yes, I have the invoice, warranty card, and proof of payment.",
                "I have digital transaction records and chat screenshots, but no invoice.",
                "No, I didn't receive an invoice/bill for the purchase."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Have you filed a formal complaint with customer support or merchant in writing?",
            "options": [
                "Yes, I sent emails and registered a support ticket.",
                "I only called customer service or complained on social media.",
                "No, I have not made a formal written complaint yet."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "Consumers have a right to get refunds or replacements for faulty items.",
            "The merchant failed to deliver the promised quality of service/product.",
            "Warranty clauses bind the seller to repair or replace the product.",
            "The defect was reported within the active warranty period.",
            "Selling defective goods constitutes an unfair trade practice.",
            "There is clear evidence of the product failure (photos or videos).",
            "The customer made repeated attempts to resolve the issue directly.",
            "A complaint at the Consumer Forum can demand compensation for harassment."
        ],
        "challenge_args": [
            "The merchant may claim the damage was caused by user misuse.",
            "Warranty often excludes physical damage or liquid spills.",
            "Without a purchase invoice, consumer rights are harder to enforce.",
            "The seller might argue the defect was not reported in time.",
            "The merchant may offer store credit instead of a cash refund.",
            "Proving service delay requires documented delivery timelines.",
            "The other side might claim you did not follow product instructions.",
            "They may argue the defect is minor and doesn't warrant replacement."
        ]
    },
    "cyber abuse": {
        "card_1": {
            "id": "card-1",
            "question": "Have you preserved screenshots or digital links of the abusive messages/accounts?",
            "options": [
                "Yes, I saved high-quality screenshots and URLs of the profiles.",
                "I have some messages, but the sender deleted them or deactivated.",
                "No, I haven't saved any screenshots or digital evidence."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Have you reported the harassment to the social platform or Cyber Crime cell?",
            "options": [
                "No, I wanted to understand my legal rights first.",
                "Yes, I reported it online on the national cyber crime portal.",
                "I blocked the user on the platform but haven't filed a police complaint."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "The IT Act strictly covers cyber crimes, online abuse, and fraud.",
            "Abusive messages and threats online constitute criminal harassment.",
            "Screenshots and digital copies are admissible evidence in court.",
            "Online identity theft or hacking can be tracked using IP logs.",
            "You have a right to get offensive content removed from platforms.",
            "Cyber cells have specialized tools to track anonymous harassers.",
            "Preserving links to the perpetrator's profiles is essential.",
            "A formal cyber crime complaint will initiate investigation."
        ],
        "challenge_args": [
            "Anonymous or fake accounts are difficult to link to a real person.",
            "If messages are deleted or profiles deactivated, logs are hard to get.",
            "The other side may claim their account was hacked or cloned.",
            "Proving the origin of threats requires cooperation from platforms.",
            "Simple screenshots can sometimes be disputed as tampered.",
            "Cyber harassment cases often face delays in platform responses.",
            "Proving mental intent behind online comments can be complex.",
            "The perpetrator may reside in a different legal jurisdiction."
        ]
    },
    "police complaint/FIR-related": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have a signed/stamped copy of your written complaint or the FIR?",
            "options": [
                "Yes, I have a copy of the FIR/complaint with a police station stamp.",
                "I submitted it online and have an acknowledgment number.",
                "No, the police refused to file it or give me a copy."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Has the police initiated any inquiry or took statement of the parties?",
            "options": [
                "No, there has been zero action or follow-up from the station.",
                "Yes, the investigating officer contacted us or took initial statements.",
                "They told me to settle the dispute mutually with the other party."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "A copy of the written complaint or FIR is crucial for trackability.",
            "Police are legally required to record cognizable offenses under the law.",
            "You are entitled to a free copy of the registered FIR.",
            "An acknowledgment number proves you officially reported the matter.",
            "Inaction on a complaint can be escalated to higher police officers.",
            "Filing a complaint sets a formal legal record of the incident.",
            "The police are bound to investigate once an FIR is registered.",
            "A magistrate can direct the police to register an FIR if they refuse."
        ],
        "challenge_args": [
            "The police may deem the issue as civil rather than criminal.",
            "Without an FIR number, tracking the progress is nearly impossible.",
            "Police may delay action if they feel the complaint lacks evidence.",
            "Verbal complaints to officers leave no official record.",
            "The other party might influence the local station or counter-complain.",
            "The police might encourage mutual settlement to close the case.",
            "Proving police refusal to file requires written evidence.",
            "Inquiries can take a long time to begin without active follow-up."
        ]
    },
    "loan/debt harassment": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have records/recordings of the recovery agents' calls and threats?",
            "options": [
                "Yes, I have call recordings, messages, and call logs.",
                "I only have screenshots of threatening WhatsApp messages.",
                "No, they only call from random numbers and I have no recordings."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Did the lending app or bank send you a formal recovery/demand notice?",
            "options": [
                "No, they are directly sending agents or harassing contacts without notice.",
                "Yes, I received a demand notice, but the interest/fees are arbitrary.",
                "I received some automated emails but no formal legal notice."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "Documenting the recovery agents' calls is crucial to prove harassment.",
            "Harassment and threats for loan recovery violate RBI guidelines.",
            "Lenders cannot contact your friends or relatives to shame you.",
            "Arbitrary interest rates or hidden fees from illegal apps are invalid.",
            "You have a right to privacy and dignified recovery procedures.",
            "Threatening messages and call records are strong proof of coercion.",
            "A complaint to the RBI Ombudsman can result in penalties for the lender.",
            "Lenders must provide a formal notice before taking recovery action."
        ],
        "challenge_args": [
            "The lender will argue that you defaulted on your repayment schedule.",
            "Lending apps often operate from outside the country, making tracking hard.",
            "If you signed access permissions, they may claim consent for contacts.",
            "Lenders might deny that the harassing agents are hired by them.",
            "Without call recordings, proving verbal abuse is challenging.",
            "If you did not receive a formal notice, the dispute is harder to file.",
            "They may claim the interest was clearly written in terms of service.",
            "A default can negatively impact your credit score and legal standing."
        ]
    },
    "maintenance": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have salary details or income proof of your spouse?",
            "options": [
                "Yes, I have salary slips or tax filings of my spouse.",
                "I know their workplace and approximate income, but no official slips.",
                "No income proof; they claim to be unemployed or work informally."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Are you currently earning or do you have dependent children?",
            "options": [
                "I am unemployed and have dependent children to support.",
                "I have a small income but it is insufficient to support myself and children.",
                "I am earning a basic salary but need spousal support under the law."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "A spouse is legally obligated to maintain their dependent partner and kids.",
            "Maintenance is a matter of right to prevent destitution.",
            "Spouse's high standard of living indicates capacity to pay.",
            "You are entitled to interim maintenance during the court case.",
            "Child support is independent of marital status or disputes.",
            "The court can assess income based on lifestyle and assets.",
            "Unemployed spouses still have a duty to support if capable.",
            "The law ensures you can maintain the same standard of living as your spouse."
        ],
        "challenge_args": [
            "The spouse may claim they are unemployed or have zero income.",
            "If you are earning a sufficient salary, maintenance may be denied.",
            "Proving hidden income or cash business earnings is very difficult.",
            "They might argue you left the marriage without a reasonable cause.",
            "The other side may claim they have other dependents like elderly parents.",
            "They could allege you have separate property or assets yielding income.",
            "Determining the exact maintenance sum is subject to court discretion.",
            "They may delay court proceedings to avoid paying interim support."
        ]
    },
    "divorce/family dispute": {
        "card_1": {
            "id": "card-1",
            "question": "Has there been any formal separation period or marriage counseling?",
            "options": [
                "Yes, we have been living separately for over a year.",
                "We recently separated or still live in the same house but dispute is active.",
                "We tried marriage counseling, but it did not resolve the issues."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Is there any written agreement regarding separation terms or dowry claims?",
            "options": [
                "No, there are no written terms; everything is contested.",
                "We have a mutual understanding or draft agreement, but not signed.",
                "There are active dowry allegations or police complaints involved."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "Irretrievable breakdown of marriage is a strong ground for separation.",
            "Mutual consent divorce is the fastest and least painful route.",
            "You have a right to claim your Stridhan and personal belongings.",
            "Cruelty and harassment are valid legal grounds for contested divorce.",
            "Living separately for over a year establishes ground for divorce.",
            "Counseling records can show efforts made to save the marriage.",
            "Active disputes need a structured legal resolution rather than conflict.",
            "Legal notice for restitution of conjugal rights is an option if desired."
        ],
        "challenge_args": [
            "A contested divorce can take several years in court.",
            "The other side may refuse to agree to a mutual consent divorce.",
            "Proving allegations of cruelty or desertion requires strict evidence.",
            "Mutual understandings are not legally binding until decreed by court.",
            "Dowry allegations must be backed by receipts or solid proof.",
            "Living in the same house makes proving desertion more complex.",
            "The other party may file counter-claims for custody or maintenance.",
            "Reconciliation attempts are favored by family courts, causing delays."
        ]
    },
    "child custody/visitation": {
        "card_1": {
            "id": "card-1",
            "question": "Who is currently holding the physical custody of the child?",
            "options": [
                "The child is with me, and the other parent is demanding custody.",
                "The child is with the other parent, and I am denied visitation/access.",
                "We have an informal split custody arrangement that is not working."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Is there any school record, medical record, or guardian agreement?",
            "options": [
                "Yes, I have all school fee receipts and medical records.",
                "The other parent holds all the child's official documents.",
                "We have some records, but no legal custody orders yet."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "The welfare of the child is the supreme consideration in custody.",
            "Both parents have a natural right to maintain contact with the child.",
            "Denying visitation to a parent is generally not in the child's interest.",
            "Mothers are usually preferred for physical custody of very young kids.",
            "Financial capacity is not the sole criteria; emotional bond matters.",
            "You have records showing you are actively caring for the child's education.",
            "Visitation rights can be obtained through interim court orders.",
            "The child's preference is considered by the court if they are old enough."
        ],
        "challenge_args": [
            "The other parent may claim you are unfit or neglectful.",
            "Without court orders, informal custody arrangements can be broken.",
            "If the child has been with one parent long, courts avoid changing custody.",
            "Proving the other parent is toxic requires strong evidence.",
            "The child may be alienated or brainwashed against you.",
            "Lack of original birth/school certificates makes filing harder.",
            "Split custody is rarely granted if parents are in active conflict.",
            "Grandparents or other relatives might contest custody claims."
        ]
    },
    "property/possession": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have registered sale deeds, registry, or partition deeds?",
            "options": [
                "Yes, I have a fully registered sale deed/title deed in my name.",
                "I have a power of attorney or inheritance papers, but not registry.",
                "No, it is an ancestral property with no clear registered partition."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Is there an active physical encroachment or trespassing on the property?",
            "options": [
                "Yes, they have built a structure or physically blocked my entry.",
                "They are threatening to trespass/sell, but physical possession is with me.",
                "It is a joint property dispute without physical encroachment yet."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "Registered sale deeds are the ultimate proof of property ownership.",
            "Encroachment or trespassing on private property is a legal offense.",
            "An injunction order can prevent the other party from selling or trespassing.",
            "Revenue records and tax receipts support your claim of possession.",
            "Partition of ancestral property can be claimed as a co-sharer's right.",
            "You have right to quiet enjoyment of your registered land.",
            "Boundary disputes can be resolved via government surveyor measurements.",
            "Police assistance can be sought to protect possession under court order."
        ],
        "challenge_args": [
            "Ancestral property disputes involve multiple legal heirs and complexities.",
            "If the property is unregistered or lacks mutation, proving title is hard.",
            "Physical possession is often hard to recover once lost to encroachment.",
            "The other side may claim adverse possession if they lived there long.",
            "Power of attorney does not confer absolute title under recent rulings.",
            "Proving boundaries without demarcation reports is difficult.",
            "Civil property disputes are notorious for taking years in court.",
            "They may argue the property partition was done verbally in the past."
        ]
    },
    "cheque/payment dispute": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have the original bounced cheque and the bank return memo?",
            "options": [
                "Yes, I have the original cheque, return memo, and bank slip.",
                "I only have bank statements showing transaction failure/photo of cheque.",
                "No, the cheque was lost or other party did not issue a cheque."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Have you sent a formal legal demand notice within 30 days of bouncing?",
            "options": [
                "Yes, my lawyer sent a formal notice under Section 138.",
                "No, I only sent WhatsApp messages or called them demanding payment.",
                "The 30-day period is still running, and I haven't sent a notice yet."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "Cheque bouncing is a criminal offense under Section 138 of NI Act.",
            "The bank return memo is official proof of payment default.",
            "A formal legal notice must be sent within 30 days of bouncing.",
            "The law presumes the cheque was issued for a legally enforceable debt.",
            "A summary suit can be filed for quick recovery of the amount.",
            "WhatsApp chats and invoices prove the underlying debt exists.",
            "The other party is liable to pay double the cheque amount as penalty.",
            "Filing a criminal case puts significant pressure on the drawer to pay."
        ],
        "challenge_args": [
            "If the 30-day notice deadline is missed, Section 138 is not maintainable.",
            "Without the original cheque and return memo, the case cannot proceed.",
            "The other side may claim the cheque was given for security, not debt.",
            "They might argue the signature is forged or the cheque was stolen.",
            "If the debt was verbal, proving a legally enforceable liability is hard.",
            "They may claim they did not receive the legal demand notice.",
            "Proving service of notice is required to establish the offense.",
            "The drawer may be insolvent, making final recovery difficult."
        ]
    },
    "contract dispute": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have a signed copy of the written contract/agreement?",
            "options": [
                "Yes, I have a signed copy of the contract/agreement.",
                "I have the draft contract and email confirmations, but unsigned.",
                "No, it was a verbal understanding with no written agreement."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Is there a specific clause defining dispute resolution or breach terms?",
            "options": [
                "Yes, there is an arbitration or termination clause.",
                "No, the agreement is basic and does not mention dispute procedures.",
                "I need to review the agreement text to confirm the clauses."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "A written contract binds both parties to the agreed terms.",
            "Failure to honor contract clauses constitutes a breach of contract.",
            "Emails and messages show mutual consent to the terms of the draft.",
            "You have performed your part of the contract and deserve payment/service.",
            "The breach has caused you direct financial or operational loss.",
            "Specific performance of the contract can be demanded in court.",
            "The contract defines the exact deliverables and timelines.",
            "An arbitration clause allows for faster dispute resolution outside court."
        ],
        "challenge_args": [
            "Proving contract terms is highly challenging without a signed copy.",
            "Verbal agreements are hard to enforce and rely on witnesses.",
            "The other side may argue you breached the terms first.",
            "They might claim the contract was terminated legally under a clause.",
            "Ambiguous clauses are subject to different legal interpretations.",
            "Proving the exact financial loss from breach requires audit proof.",
            "They may argue the contract was signed under pressure or mistake.",
            "Jurisdiction clauses may force you to file in a different city."
        ]
    },
    "other": {
        "card_1": {
            "id": "card-1",
            "question": "Do you have any written records (messages, emails, receipts) of this transaction?",
            "options": [
                "Yes, I have comprehensive messages, emails, or receipts.",
                "I only have minor messages or verbal witnesses.",
                "No, it was entirely verbal with no written records."
            ],
            "side": "left",
            "answered": False
        },
        "card_2": {
            "id": "card-2",
            "question": "Have you sent any formal communication or notice requesting resolution?",
            "options": [
                "Yes, I sent a formal email/message requesting a resolution.",
                "No, I have only had verbal discussions so far.",
                "I am planning to send one soon."
            ],
            "side": "right",
            "answered": False
        },
        "support_args": [
            "Having written records helps build a clear factual timeline.",
            "The other party is obligated to act in good faith and resolve the issue.",
            "A formal notice or demand letter is the right first step.",
            "Verbal agreements are recognized by law if backed by conduct.",
            "Your detailed explanation provides a solid foundation for a claim.",
            "You have made reasonable efforts to settle the dispute amicably.",
            "Bank statements showing money transfers are strong evidence.",
            "A legal advisor can help structure this into a formal complaint."
        ],
        "challenge_args": [
            "Proving the terms of a verbal understanding is always challenging.",
            "The other side may completely deny any agreement or transaction.",
            "Without receipts or invoices, transaction values cannot be verified.",
            "If no notice was sent, they may claim they were unaware of the issue.",
            "Verbal discussions leave no paper trail for the court to review.",
            "Proving a claim without documentation requires independent witnesses.",
            "The other party might claim the money was a gift or separate deal.",
            "Proving timelines without digital stamps relies purely on memory."
        ]
    }
}

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
            analysis = cls.analyze_real_life_case(session.description or "", session.title or "")
            matter_type = analysis.get("matter_type", "other")
            res = CASE_ALIGNED_RESOURCES.get(matter_type, CASE_ALIGNED_RESOURCES["other"])

            async def stream_and_save_event(speaker: str, role: str, text: str, event_type: str = "argument", card_data: dict = None):
                yield make_sse("turn_started", {"role": role, "speaker": speaker})
                await asyncio.sleep(0.1)
                words = text.split(" ")
                for i in range(0, len(words), 4):
                    chunk = " ".join(words[i:i+4]) + " "
                    yield make_sse("argument_chunk", {"chunk": chunk})
                    await asyncio.sleep(0.03)
                
                evt = TranscriptEvent(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker=speaker,
                    role=role,
                    text=text,
                    event_type=event_type,
                    card_data=card_data,
                    created_at=datetime.utcnow()
                )
                db.add(evt)
                await db.commit()

            if events_count <= 1:
                # Turn 1: Support Review (arg 1)
                async for chunk in stream_and_save_event("Support Review", "petitioner", res["support_args"][0]):
                    yield chunk
                # Turn 2: Challenge Review (arg 1)
                async for chunk in stream_and_save_event("Challenge Review", "respondent", res["challenge_args"][0]):
                    yield chunk
                # Turn 3: Support Review (arg 2)
                async for chunk in stream_and_save_event("Support Review", "petitioner", res["support_args"][1]):
                    yield chunk
                # Turn 4: Challenge Review (arg 2)
                async for chunk in stream_and_save_event("Challenge Review", "respondent", res["challenge_args"][1]):
                    yield chunk
                # Turn 5: Card 1 (clarification_request)
                card_data = res["card_1"]
                yield make_sse("clarification_card", card_data)
                async for chunk in stream_and_save_event(
                    "Challenge Review", 
                    "respondent", 
                    f"To help us evaluate, could you clarify: {card_data['question']}", 
                    "clarification_request", 
                    card_data
                ):
                    yield chunk

            elif events_count == 7:
                # Turn 6: Support Review (arg 3)
                async for chunk in stream_and_save_event("Support Review", "petitioner", res["support_args"][2]):
                    yield chunk
                # Turn 7: Challenge Review (arg 3)
                async for chunk in stream_and_save_event("Challenge Review", "respondent", res["challenge_args"][2]):
                    yield chunk
                # Turn 8: Support Review (arg 4)
                async for chunk in stream_and_save_event("Support Review", "petitioner", res["support_args"][3]):
                    yield chunk
                # Turn 9: Challenge Review (arg 4)
                async for chunk in stream_and_save_event("Challenge Review", "respondent", res["challenge_args"][3]):
                    yield chunk
                # Turn 10: Card 2 (clarification_request)
                card_data = res["card_2"]
                yield make_sse("clarification_card", card_data)
                async for chunk in stream_and_save_event(
                    "Guide", 
                    "bench", 
                    f"Let's refine our understanding. Please clarify: {card_data['question']}", 
                    "clarification_request", 
                    card_data
                ):
                    yield chunk

            elif events_count == 13:
                # Turn 11 to 18: 8 remaining arguments (Support/Challenge 5 to 8)
                for i in range(4, 8):
                    async for chunk in stream_and_save_event("Support Review", "petitioner", res["support_args"][i]):
                        yield chunk
                    async for chunk in stream_and_save_event("Challenge Review", "respondent", res["challenge_args"][i]):
                        yield chunk
                
                # Turn 19: Guide closing note
                async for chunk in stream_and_save_event("Guide", "bench", "All details have been recorded. I will now compile these facts and prepare your Guidance Report with practical next steps."):
                    yield chunk
                
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
