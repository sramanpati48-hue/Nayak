import unittest
import json
import os
from app.services.nyaybandhu_service import NyaybandhuService

class TestNyaybandhuIntake(unittest.TestCase):
    
    def test_rent_deposit_dispute(self):
        title = "Rent deposit issue"
        description = "My landlord is refusing to return my security deposit of Rs 35,000. I lived in the flat for 3 years, and moved out last week. I paid rent on time and left the flat clean, but he has blocked my calls and messages."
        
        result = NyaybandhuService.analyze_real_life_case(description, title)
        
        self.assertEqual(result["matter_type"], "landlord-tenant")
        self.assertFalse(result["safety_flag"])
        self.assertEqual(result["urgency_level"], "medium")
        self.assertLessEqual(len(result["follow_up_questions"]), 5)
        self.assertIn("deposit", result["relief_sought"][0].lower() or result["relief_sought"][1].lower())
        
    def test_domestic_violence_case(self):
        title = "Domestic abuse and safety concerns"
        description = "My spouse has been physically abusive towards me. Last night, he threatened to hit me with a stick, and I had to leave the house with my child. We are currently staying at a neighbor's house, but he is searching for us and sending threatening messages."
        
        result = NyaybandhuService.analyze_real_life_case(description, title)
        
        self.assertEqual(result["matter_type"], "domestic violence")
        self.assertTrue(result["safety_flag"])
        self.assertEqual(result["urgency_level"], "high")
        self.assertLessEqual(len(result["follow_up_questions"]), 5)
        
        # Verify no landlord/tenant wording in DV strengths/weaknesses
        for strength in result["strengths"]:
            self.assertNotIn("lease", strength.lower())
            self.assertNotIn("agreement", strength.lower())
        for weakness in result["weaknesses_or_gaps"]:
            self.assertNotIn("lease", weakness.lower())
            self.assertNotIn("agreement", weakness.lower())
            
    def test_ambiguous_case(self):
        title = "General dispute"
        description = "I gave my laptop to a local shop to repair it. They told me it would cost Rs 2,000. However, when I went to pick it up, they demanded Rs 5,000 and refused to give it back unless I paid the full amount."
        
        result = NyaybandhuService.analyze_real_life_case(description, title)
        
        self.assertEqual(result["matter_type"], "consumer complaint")
        self.assertFalse(result["safety_flag"])
        self.assertEqual(result["urgency_level"], "low")
        self.assertLessEqual(len(result["follow_up_questions"]), 5)
        
    def test_manual_safety_tag_regression(self):
        title = "Eviction issue"
        description = "[SAFETY_ALERT: TRUE] My landlord wants to throw me out of my house."
        
        result = NyaybandhuService.analyze_real_life_case(description, title)
        
        self.assertTrue(result["safety_flag"])
        self.assertEqual(result["urgency_level"], "high")
        self.assertNotIn("[SAFETY_ALERT: TRUE]", result["facts"][0])

    def test_json_shape_and_keys(self):
        title = "Test Case"
        description = "Just some description for testing."
        
        result = NyaybandhuService.analyze_real_life_case(description, title)
        
        expected_keys = {
            "matter_type", "title", "summary", "facts", "timeline", 
            "people_involved", "relief_sought", "documents_available", 
            "immediate_risks", "legal_issues_preliminary", "strengths", 
            "weaknesses_or_gaps", "missing_information", "recommended_next_steps", 
            "follow_up_questions", "safety_flag", "urgency_level", "disclaimer"
        }
        
        self.assertEqual(set(result.keys()), expected_keys)

    def test_ai_agent_wording_removed_from_codebase(self):
        # 1. Check backend service
        backend_path = os.path.join(os.path.dirname(__file__), "app", "services", "nyaybandhu_service.py")
        with open(backend_path, "r", encoding="utf-8") as f:
            backend_content = f.read()
            self.assertNotIn('"Support Review (AI Agent)"', backend_content)
            self.assertNotIn('"Challenge Review (AI Agent)"', backend_content)
            
        # 2. Check frontend page
        frontend_path = os.path.join(os.path.dirname(__file__), "..", "web", "src", "app", "nyaybandhu", "[id]", "page.tsx")
        if os.path.exists(frontend_path):
            with open(frontend_path, "r", encoding="utf-8") as f:
                frontend_content = f.read()
                self.assertNotIn('"Support Review (AI Agent)"', frontend_content)
                self.assertNotIn('"Challenge Review (AI Agent)"', frontend_content)

if __name__ == "__main__":
    unittest.main()
