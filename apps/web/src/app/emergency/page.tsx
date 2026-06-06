"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  AlertTriangle,
  BatteryCharging,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  HeartPulse,
  LifeBuoy,
  LocateFixed,
  MapPin,
  Navigation2,
  Phone,
  ShieldAlert,
  Users,
  WifiOff,
} from "lucide-react";
 
const QUICK_DIALS: { key: string; number: string; en: string; hi: string }[] = [
  { key: "100", number: "100", en: "Police", hi: "पुलिस" },
  { key: "101", number: "101", en: "Fire Service", hi: "अग्निशमन" },
  { key: "1098", number: "1098", en: "Childline", hi: "चाइल्डलाइन" },
  { key: "1091", number: "1091", en: "Women’s Helpline", hi: "महिला हेल्पलाइन" },
  { key: "181", number: "181", en: "Women’s Support", hi: "महिला सहायता" },
  { key: "1930", number: "1930", en: "Cyber Crime Helpline", hi: "साइबर क्राइम हेल्पलाइन" },
  { key: "108", number: "108", en: "Ambulance Service", hi: "एम्बुलेंस सेवा" },
];

type LocationState = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
};

type HelpTopic = {
  name: string;
  helplines: string[];
  nearbyAssistance: string[];
  rights: string[];
  actions: string[];
};

type EmergencyService = {
  name: string;
  kind: string;
  description: string;
  query: string;
};

type AnalysisSignal = {
  title: string;
  description: string;
};

type BatteryState = {
  level: number;
  charging: boolean;
  addEventListener: (type: "levelchange" | "chargingchange", listener: () => void) => void;
};

const trustedContacts = [
  { name: "Primary trusted contact", role: "Family / friend" },
  { name: "Backup trusted contact", role: "Neighbor / coworker" },
  { name: "Local support contact", role: "Lawyer / NGO / volunteer" },
];

const emergencyServices: EmergencyService[] = [
  { name: "Police Station", kind: "Police", description: "Immediate protection, reporting, escort support", query: "police station" },
  { name: "Hospital", kind: "Medical", description: "Emergency care, trauma support, referrals", query: "hospital emergency" },
  { name: "Pharmacy", kind: "Medical", description: "Medication access and first-aid supplies", query: "24 hour pharmacy" },
  { name: "Shelter Home", kind: "Protection", description: "Safe stay, crisis accommodation, referrals", query: "women shelter home" },
  { name: "Legal Aid Center", kind: "Legal", description: "Free or low-cost legal guidance and representation", query: "legal aid center" },
  { name: "NGO / Helpline", kind: "Support", description: "Counseling, case support, and rescue coordination", query: "ngo support helpline" },
];

const analysisSignals: AnalysisSignal[] = [
  { title: "Distress keywords", description: "Spot urgent language in messages like fear, help, danger, or stop." },
  { title: "User-reported threats", description: "Flag explicit threats, stalking, coercion, or imminent harm reports." },
  { title: "Repeated harassment complaints", description: "Escalate repeated abuse, intimidation, and persistent contact patterns." },
];

const helpTopics: HelpTopic[] = [
  {
    name: "Legal Help",
    helplines: ["District Legal Services Authority", "Legal aid clinic", "Duty lawyer / court help desk"],
    nearbyAssistance: ["Legal aid center", "Women and child cell", "Police complaint desk"],
    rights: ["Right to file a complaint", "Right to legal counsel", "Right to emergency protection"],
    actions: ["Collect documents", "Write a short incident timeline", "Contact legal aid first"],
  },
  {
    name: "Women’s Safety",
    helplines: ["100 police", "1091 women helpline", "181 women support"],
    nearbyAssistance: ["Women’s shelter", "Police station", "Support NGO"],
    rights: ["Protection from abuse and harassment", "Safe reporting", "Confidential support"],
    actions: ["Move to a crowded safe area", "Share live location", "Call emergency contacts"],
  },
  {
    name: "Child Protection",
    helplines: ["100 police", "1098 child helpline", "Child welfare officer"],
    nearbyAssistance: ["Child welfare committee", "Hospital", "Police child unit"],
    rights: ["Protection from abuse and trafficking", "Access to care and shelter", "Child-friendly reporting"],
    actions: ["Keep the child safe", "Avoid confrontation", "Contact child protection authorities"],
  },
  {
    name: "Domestic Violence",
    helplines: ["100 police", "181 women helpline", "Protection officer"],
    nearbyAssistance: ["Shelter home", "Legal aid center", "Medical emergency room"],
    rights: ["Protection order options", "Immediate safety planning", "Medical and legal support"],
    actions: ["Leave if it is safe to do so", "Save evidence", "Inform a trusted contact"],
  },
  {
    name: "Medical Emergency",
    helplines: ["108 ambulance", "102 ambulance", "Hospital emergency desk"],
    nearbyAssistance: ["Hospital", "Pharmacy", "Ambulance pickup point"],
    rights: ["Emergency treatment", "Ambulance support", "Referral to trauma care"],
    actions: ["Share exact location", "Keep the person stable", "Follow dispatcher instructions"],
  },
  {
    name: "Cyber Crime",
    helplines: ["1930 cyber crime helpline", "Cybercrime portal", "Local cyber cell"],
    nearbyAssistance: ["Cyber police station", "Legal aid center", "Bank fraud cell"],
    rights: ["Right to preserve digital evidence", "Right to report online fraud", "Right to request account safety steps"],
    actions: ["Change passwords", "Freeze suspicious accounts", "Capture screenshots and timestamps"],
  },
  {
    name: "Senior Citizen Support",
    helplines: ["100 police", "Elder support line", "Community health worker"],
    nearbyAssistance: ["Hospital", "Legal aid center", "Local NGO"],
    rights: ["Support against neglect and abuse", "Access to health care", "Assisted reporting"],
    actions: ["Check medication needs", "Contact family or support worker", "Document any abuse"],
  },
  {
    name: "Missing Person Report",
    helplines: ["100 police", "Local police station", "Missing person desk"],
    nearbyAssistance: ["Police station", "Hospital", "Rail / bus assistance desk"],
    rights: ["Prompt complaint registration", "Search support", "Identity verification assistance"],
    actions: ["Share recent photo", "List last-known location", "Alert trusted contacts"],
  },
  {
    name: "Human Trafficking",
    helplines: ["100 police", "Anti-trafficking unit", "Rescue NGO"],
    nearbyAssistance: ["Police station", "Shelter home", "Legal aid center"],
    rights: ["Protection from coercion", "Safe rescue process", "Victim support services"],
    actions: ["Do not confront traffickers alone", "Share location discreetly", "Contact rescue support immediately"],
  },
  {
    name: "Mental Health Support",
    helplines: ["14416 Tele-MANAS", "Mental health helpline", "Counselor / psychiatrist"],
    nearbyAssistance: ["Hospital psychiatry unit", "Counseling center", "Trusted person"],
    rights: ["Respectful care", "Emergency de-escalation", "Confidential support"],
    actions: ["Stay with the person", "Reduce sharp objects or hazards", "Seek professional support quickly"],
  },
  {
    name: "Disaster Relief",
    helplines: ["1078 district disaster control room", "District disaster control room", "Local relief center"],
    nearbyAssistance: ["Relief camp", "Hospital", "Shelter home"],
    rights: ["Access to relief information", "Evacuation assistance", "Food, water, and shelter support"],
    actions: ["Move to higher ground if needed", "Keep documents dry", "Follow official evacuation guidance"],
  },
];

function buildMapsSearch(query: string, location?: LocationState | null) {
  const params = new URLSearchParams();
  const searchQuery = location
    ? `${query} near ${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`
    : `${query} near me`;
  params.set("api", "1");
  params.set("query", searchQuery);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export default function EmergencyPage() {
  const watchRef = useRef<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
  const [cachedLocation, setCachedLocation] = useState<LocationState | null>(null);
  const [tracking, setTracking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Start tracking to capture live GPS updates.");
  const [battery, setBattery] = useState<{ level?: number; charging?: boolean } | null>(null);
  const [selectedTopic, setSelectedTopic] = useState(helpTopics[0].name);
  const [sosState, setSOSState] = useState<"idle" | "prepared" | "sent">("idle");
  const [copyState, setCopyState] = useState("Copy location alert");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [fakePin, setFakePin] = useState("");
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "done">("idle");
  const mediaChunksRef = useRef<Blob[]>([]);
  const lastBlobRef = useRef<Blob | null>(null);
  const recordingStopTimeoutRef = useRef<number | null>(null);
  const [nearbyPoliceUrl, setNearbyPoliceUrl] = useState<string | null>(null);
  const [nearbyHospitalUrl, setNearbyHospitalUrl] = useState<string | null>(null);

  const activeLocation = currentLocation ?? cachedLocation;
  const locationSummary = activeLocation
    ? `Lat ${activeLocation.latitude.toFixed(5)}, Lng ${activeLocation.longitude.toFixed(5)}`
    : "Location not captured yet.";
  const batteryText =
    battery?.level !== undefined
      ? `${Math.round(battery.level * 100)}%${battery.charging ? " charging" : ""}`
      : "Battery unavailable";

  const selectedHelpTopic = useMemo(
    () => helpTopics.find((topic) => topic.name === selectedTopic) ?? helpTopics[0],
    [selectedTopic],
  );

  const sharedPayload = [
    "Emergency alert from Nayak",
    `Category: ${selectedHelpTopic.name}`,
    `Location: ${locationSummary}`,
    `Battery: ${batteryText}`,
    `Status: ${statusMessage}`,
  ].join("\n");

  useEffect(() => {
    if (!activeLocation) return;
    window.localStorage.setItem("nayak-emergency-location", JSON.stringify(activeLocation));
  }, [activeLocation]);

  useEffect(() => {
    const stored = window.localStorage.getItem("nayak-emergency-location");
    if (stored) {
      try {
        setCachedLocation(JSON.parse(stored) as LocationState);
      } catch {
        window.localStorage.removeItem("nayak-emergency-location");
      }
    }

    const batteryApi = (navigator as Navigator & { getBattery?: () => Promise<BatteryState> }).getBattery;
    if (batteryApi) {
      batteryApi()
        .then((batteryManager) => {
          setBattery({ level: batteryManager.level, charging: batteryManager.charging });
          batteryManager.addEventListener("levelchange", () => {
            setBattery({ level: batteryManager.level, charging: batteryManager.charging });
          });
          batteryManager.addEventListener("chargingchange", () => {
            setBattery({ level: batteryManager.level, charging: batteryManager.charging });
          });
        })
        .catch(() => undefined);
    }

    return () => {
      if (watchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not available in this browser.");
      return;
    }

    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    setTracking(true);
    setStatusMessage("Requesting live GPS updates...");

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation: LocationState = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setCurrentLocation(nextLocation);
        setCachedLocation(nextLocation);
        setStatusMessage(`Live location updated at ${formatTime(position.timestamp)}.`);
      },
      (error) => {
        setStatusMessage(error.message || "Unable to access location.");
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
  };

  const stopTracking = () => {
    if (watchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
    setStatusMessage("Live tracking paused.");
  };

  const playBeep = () => {
    try {
      const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.02;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      window.setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 150);
    } catch {
      // ignore if not available
    }
  };

  const immediateCall = (num: string) => {
    playBeep();
    if (navigator.vibrate) navigator.vibrate(200);
    window.location.href = `tel:${num}`;
  };

  const handleDiscreetTrigger = (source: "shake" | "pin") => {
    setStatusMessage(`Silent SOS triggered via ${source}.`);
    startTracking();
    startRecording();
    const police = buildMapsSearch("police station", currentLocation ?? cachedLocation);
    const hospital = buildMapsSearch("hospital", currentLocation ?? cachedLocation);
    setNearbyPoliceUrl(police);
    setNearbyHospitalUrl(hospital);
    triggerSOS();
    setTimeout(() => {
      uploadSOS().catch(() => {});
    }, 500);
  };

  // --- Discreet triggers support ---
  useEffect(() => {
    const stored = window.localStorage.getItem("nayak-fake-pin");
    if (stored) setStoredPin(stored);

    // Shake detection: look for 3 strong shakes within 1500ms
    if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      let shakeTimestamps: number[] = [];
      const threshold = 14; // m/s^2 change beyond gravity
      const handler = (ev: DeviceMotionEvent) => {
        const a = ev.accelerationIncludingGravity;
        if (!a) return;
        const ax = a.x || 0;
        const ay = a.y || 0;
        const az = a.z || 0;
        const mag = Math.sqrt(ax * ax + ay * ay + az * az);
        const delta = Math.abs(mag - 9.80665);
        if (delta > threshold) {
          const now = Date.now();
          shakeTimestamps.push(now);
          // keep only recent
          shakeTimestamps = shakeTimestamps.filter(t => now - t < 1500);
          if (shakeTimestamps.length >= 3) {
            // trigger discreet SOS
            handleDiscreetTrigger("shake");
            shakeTimestamps = [];
          }
        }
      };
      window.addEventListener("devicemotion", handler as EventListener);
      return () => window.removeEventListener("devicemotion", handler as EventListener);
    }
  }, []);

  const saveFakePin = () => {
    if (!fakePin) return;
    window.localStorage.setItem("nayak-fake-pin", fakePin);
    setStoredPin(fakePin);
    setFakePin("");
  };

  const clearFakePin = () => {
    window.localStorage.removeItem("nayak-fake-pin");
    setStoredPin(null);
  };

  const handleFakePinEntry = (entered: string) => {
    if (storedPin && entered === storedPin) {
      handleDiscreetTrigger("pin");
    }
  };

  // media recording (audio/video) for evidence
  const startRecording = async (durationMs = 120_000) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) mediaChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        lastBlobRef.current = blob;
        setRecordingState("done");
        // stop tracks
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecordingState("recording");
      // auto-stop
      recordingStopTimeoutRef.current = window.setTimeout(() => {
        try { mr.stop(); } catch { /* ignore */ }
        recordingStopTimeoutRef.current = null;
      }, durationMs) as unknown as number;
    } catch (err) {
      // permission denied or unavailable
      setRecordingState("idle");
    }
  };

  const stopRecording = () => {
    // stopping handled by recorder on timeout; attempt to clear timeout
    if (recordingStopTimeoutRef.current) {
      clearTimeout(recordingStopTimeoutRef.current);
      recordingStopTimeoutRef.current = null;
    }
  };

  const copyAlert = async () => {
    await navigator.clipboard.writeText(sharedPayload);
    setCopyState("Location alert copied");
    window.setTimeout(() => setCopyState("Copy location alert"), 2500);
  };

  const shareToContact = async (contact: { name: string; role: string }) => {
    setCopyState("Sharing...");
    const text = `${contact.name} (${contact.role})\n\n${sharedPayload}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Nayak emergency", text });
        setCopyState("Shared");
        window.setTimeout(() => setCopyState("Copy location alert"), 2500);
        return;
      }
    } catch {
      // fall through to clipboard fallback
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopyState("Shared to clipboard");
        window.setTimeout(() => setCopyState("Copy location alert"), 2500);
        return;
      }
      const mailto = `mailto:?subject=${encodeURIComponent(`Emergency alert for ${contact.name}`)}&body=${encodeURIComponent(text)}`;
      window.location.href = mailto;
      setCopyState("Opened email share");
      window.setTimeout(() => setCopyState("Copy location alert"), 2500);
      return;
    } catch {
      // last resort
      alert("Unable to share — please copy the alert manually.");
    }
  };

  const triggerSOS = async () => {
    await navigator.clipboard.writeText(sharedPayload);
    setSOSState("prepared");
    window.setTimeout(() => setSOSState("sent"), 600);
    window.setTimeout(() => setSOSState("idle"), 3000);
    // upload to backend if available
    uploadSOS().catch(() => {});
  };

  const uploadSOS = async () => {
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string) ?? "http://localhost:8000/api/v1";
      const url = `${API_BASE}/sos/sos`;
      const payloadObj = {
        category: selectedTopic,
        payload: {
          text: sharedPayload,
          location: activeLocation,
          time: new Date().toISOString(),
        },
      };

      if (lastBlobRef.current) {
        const fd = new FormData();
        fd.append("category", selectedTopic);
        fd.append("payload", JSON.stringify(payloadObj));
        fd.append("file", lastBlobRef.current, `sos_${Date.now()}.webm`);
        await fetch(url, {
          method: "POST",
          body: fd,
          mode: "cors",
        });
      } else {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ payload: JSON.stringify(payloadObj), category: selectedTopic }),
          mode: "cors",
        });
      }
    } catch (err) {
      // ignore upload errors silently; will retry later if needed
    }
  };

    const renderHelplineLink = (item: string) => {
      // try to extract a phone number (3-4 digits common in India like 112,1098,108)
      const m = item.match(/(\d{3,4})/);
      if (m) {
        const num = m[1];
        return (
          <a href={`tel:${num}`} className="text-primary hover:underline">
            {item}
          </a>
        );
      }
      // fallback: open a maps search for the helpline/organization
      return (
        <a href={buildMapsSearch(item, activeLocation)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          {item}
        </a>
      );
    };

  return (
    <DashboardLayout>
      <div className={`space-y-8 ${"emergency-active"}`}>
        {/* Quick Dial Strip (High priority, one-tap) */}
        <div className="rounded-lg border-2 border-destructive/60 p-4 bg-destructive/5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              {lang === "en" ? "One-tap Emergency Calls" : "वन-टैप आपातकाल कॉल"}
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">EN</label>
              <input aria-label="language-en" type="radio" checked={lang === "en"} onChange={() => setLang("en")} />
              <label className="text-xs text-muted-foreground ml-2">हिं</label>
              <input aria-label="language-hi" type="radio" checked={lang === "hi"} onChange={() => setLang("hi")} />
            </div>
          </div>

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK_DIALS.map((d) => (
              <button
                key={d.key}
                onClick={() => immediateCall(d.number)}
                aria-label={`${d.number} ${lang === "en" ? d.en : d.hi}`}
                className="rounded-lg bg-destructive text-destructive-foreground flex flex-col items-center justify-center gap-1 p-4 shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-destructive"
              >
                <span className="text-lg font-extrabold">{d.number}</span>
                <span className="text-[11px]">{lang === "en" ? d.en : d.hi}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visual alert note for accessibility */}
        <div className="text-xs text-muted-foreground">{lang === "en" ? "Emergency screen active — one tap will attempt to call immediately." : "आपातकाल स्क्रीन सक्रिय — एक टैप तुरंत कॉल का प्रयास करेगा।"}</div>

        {/* (rest of the page follows) */}
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Safety Module</span>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Emergency & Safety Hub</h1>
          </div>
          <p className="text-muted-foreground max-w-[900px] text-sm">
            Capture live GPS, prepare a Smart SOS package, and jump to nearby help when you need police, medical, shelter, legal, or protection support.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section id="location" className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <LocateFixed className="h-4.5 w-4.5 text-primary" />
                  Know My Location
                </h2>
                <p className="text-xs text-muted-foreground">Real-time GPS tracking with offline caching for the last known position.</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 ${tracking ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-border bg-secondary/20"}`}>
                  {tracking ? <CheckCircle2 className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {tracking ? "Live tracking on" : "Tracking paused"}
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-border bg-secondary/20 px-2 py-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {activeLocation ? formatTime(activeLocation.timestamp) : "Waiting for location"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-foreground">Live GPS feed</span>
                  <span className="text-[11px] text-muted-foreground">{statusMessage}</span>
                </div>
                <div className="rounded border border-dashed border-border/80 p-4 text-sm leading-relaxed">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">{locationSummary}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeLocation ? `Accuracy: ${Math.round(activeLocation.accuracy ?? 0)} meters` : "Grant location permission to begin live tracking."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={startTracking} className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-4 transition-colors">
                    <Navigation2 className="h-4 w-4" />
                    Start live tracking
                  </button>
                  <button onClick={stopTracking} className="inline-flex items-center justify-center gap-2 rounded border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold h-9 px-4 transition-colors">
                    Pause tracking
                  </button>
                  <button onClick={copyAlert} className="inline-flex items-center justify-center gap-2 rounded border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold h-9 px-4 transition-colors">
                    <Copy className="h-4 w-4" />
                    {copyState}
                  </button>
                </div>
              </div>

              <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">Offline cache</span>
                  <span className="text-[11px] text-muted-foreground">Last saved locally</span>
                </div>
                <div className="rounded border border-dashed border-border/80 p-4 text-xs leading-relaxed text-muted-foreground">
                  {cachedLocation ? (
                    <div className="space-y-1.5">
                      <p className="text-foreground font-semibold">Cached location available</p>
                      <p>{cachedLocation.latitude.toFixed(5)}, {cachedLocation.longitude.toFixed(5)}</p>
                      <p>Saved {formatTime(cachedLocation.timestamp)}</p>
                    </div>
                  ) : (
                    <p>No offline location saved yet. Once live tracking runs, the last known point will remain cached on this device.</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  Local-only cache, useful when network is unstable or unavailable.
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Phone className="h-4.5 w-4.5 text-primary" />
                  Smart SOS System
                </h2>
                <p className="text-xs text-muted-foreground">One-tap emergency package with location, profile, category, time, and battery status.</p>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-semibold text-muted-foreground block">Emergency category</label>
                <select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)} className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                  {helpTopics.map((topic) => (
                    <option key={topic.name} value={topic.name}>{topic.name}</option>
                  ))}
                </select>
              </div>

              <div className="rounded border border-border bg-secondary/10 p-4 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <BatteryCharging className="h-4 w-4 text-primary" />
                  SOS payload preview
                </div>
                <p className="text-muted-foreground">{locationSummary}</p>
                <p className="text-muted-foreground">Time: {activeLocation ? formatTime(activeLocation.timestamp) : "Waiting for location"}</p>
                <p className="text-muted-foreground">Battery: {battery?.level !== undefined ? `${Math.round(battery.level * 100)}%${battery.charging ? " charging" : ""}` : "Unavailable"}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={triggerSOS} className="inline-flex items-center justify-center gap-2 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold h-10 px-4 shadow-sm transition-colors">
                  <ShieldAlert className="h-4 w-4" />
                  One-tap SOS
                </button>
                <a href="tel:100" className="inline-flex items-center justify-center gap-2 rounded border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold h-10 px-4 transition-colors">
                  <Phone className="h-4 w-4" />
                  Call 100 instantly
                </a>
              </div>

              <div className={`rounded border p-3 text-xs ${sosState === "sent" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border bg-secondary/10 text-muted-foreground"}`}>
                {sosState === "sent" ? "SOS package copied and ready to send to trusted contacts." : sosState === "prepared" ? "Preparing SOS package..." : "SOS stays local until you copy or call. Pair this with your emergency contacts."}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  Trusted contacts
                </h2>
                <p className="text-xs text-muted-foreground">Prepared sharing flow for the people you trust most.</p>
              </div>

              <div className="space-y-2">
                {trustedContacts.map((contact) => (
                  <button
                    key={contact.name}
                    type="button"
                    onClick={() => shareToContact(contact)}
                    className="flex w-full items-center justify-between gap-3 rounded border border-border bg-secondary/10 px-3 py-3 text-left text-xs hover:bg-secondary/20 hover:border-primary/40 transition-colors cursor-pointer"
                    aria-label={`Share alert with ${contact.name}`}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{contact.name}</p>
                      <p className="text-muted-foreground">{contact.role}</p>
                    </div>
                    <span className="inline-flex min-w-[96px] items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-semibold text-primary">Share</span>
                  </button>
                ))}
              </div>
            </section>
            {/* Discreet triggers and fake PIN setup */}
            <section className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-primary" />
                  Discreet Safety Triggers
                </h2>
                <p className="text-xs text-muted-foreground">Setup a fake PIN or use the shake gesture to trigger a silent SOS and start recording.</p>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-semibold text-muted-foreground block">Set fake PIN (example: 0000)</label>
                <div className="flex gap-2">
                  <input value={fakePin} onChange={(e) => setFakePin(e.target.value)} placeholder="Enter fake PIN" className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground" />
                  <button onClick={saveFakePin} className="inline-flex items-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-3">Save</button>
                </div>
                {storedPin && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="text-muted-foreground">Fake PIN set</div>
                    <button onClick={clearFakePin} className="text-xs text-destructive">Clear</button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold">Recording</div>
                  <div className="text-[11px] text-muted-foreground">{recordingState === "idle" ? "Not recording" : recordingState === "recording" ? "Recording..." : "Recording ready"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startRecording()} className="inline-flex items-center gap-2 rounded border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold h-9 px-3">Start (test)</button>
                  <button onClick={() => stopRecording()} className="inline-flex items-center gap-2 rounded border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold h-9 px-3">Stop</button>
                  {recordingUrl && (
                    <a href={recordingUrl} download="nayak_evidence.webm" className="inline-flex items-center gap-2 rounded bg-primary text-primary-foreground text-xs font-semibold h-9 px-3">Download</a>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <LifeBuoy className="h-4.5 w-4.5 text-primary" />
                Ask for Help
              </h2>
              <p className="text-xs text-muted-foreground">Pick a category to get helplines, nearby assistance, rights guidance, and immediate actions.</p>
            </div>
            <span className="text-[11px] text-muted-foreground rounded border border-border bg-secondary/20 px-3 py-1">Selected: {selectedHelpTopic.name}</span>
          </div>

          <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">What this screen can analyze</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {analysisSignals.map((signal) => (
                <div key={signal.title} className="rounded border border-border/70 bg-card px-3 py-3">
                  <p className="text-xs font-semibold text-foreground">{signal.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{signal.description}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Use the matched analysis to suggest helplines, legal remedies, and nearby support organizations.</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {helpTopics.map((topic) => (
              <div
                key={topic.name}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTopic(topic.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedTopic(topic.name);
                }}
                className={`rounded border p-3 text-left transition-all ${selectedTopic === topic.name ? "border-primary bg-primary/10" : "border-border bg-secondary/10 hover:bg-secondary/20"}`}
              >
                <p className="text-sm font-semibold text-foreground">{topic.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{renderHelplineLink(topic.helplines[0])}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Relevant helplines</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {selectedHelpTopic.helplines.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{renderHelplineLink(item)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Nearby support organizations</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                {selectedHelpTopic.nearbyAssistance.map((item) => (
                  <div key={item} className="flex items-center justify-between gap-3 rounded border border-border/60 bg-card px-3 py-2">
                    <span>{item}</span>
                    <Link href={buildMapsSearch(item, activeLocation)} target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Search
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Legal rights guidance</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {selectedHelpTopic.rights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Emergency actions</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {selectedHelpTopic.actions.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-secondary/15 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                Nearby service searches
              </h2>
              <p className="text-xs text-muted-foreground">Use live GPS coordinates to quickly search for police, hospitals, pharmacies, shelters, legal aid, and NGOs.</p>
            </div>
            <span className="text-[11px] text-muted-foreground rounded border border-border bg-card px-3 py-1">Location-aware search links</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {emergencyServices.map((service) => (
              <div key={service.name} className="rounded border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{service.name}</p>
                    <p className="text-[11px] text-muted-foreground">{service.kind}</p>
                  </div>
                  <HeartPulse className="h-4.5 w-4.5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{service.description}</p>
                <div className="flex items-center gap-2">
                  <Link href={buildMapsSearch(service.query, activeLocation)} target="_blank" className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-3 transition-colors">
                    <MapPin className="h-4 w-4" />
                    Find nearest
                  </Link>
                  <a href="tel:100" className="inline-flex items-center justify-center gap-2 rounded border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold h-9 px-3 transition-colors">
                    <Phone className="h-4 w-4" />
                    100
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}