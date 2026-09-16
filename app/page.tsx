"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HOUSING_OPTIONS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  REASON_OPTIONS,
  createRecommendations,
  emptyProfile,
  findDestination,
  type Priority,
  type UserProfile,
} from "../lib/recommendations";

const NeighborhoodMap = dynamic(() => import("../components/NeighborhoodMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparing your Vancouver map…</div>,
});

const steps = ["Welcome", "Your move", "Your needs", "Priorities", "Results"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState("");
  const recommendations = useMemo(() => createRecommendations(profile), [profile]);

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const validate = () => {
    if (step === 0 && !profile.firstName.trim()) return "Enter your first name to continue.";
    if (step === 1 && (!profile.currentCity.trim() || !profile.reason || !profile.housingType))
      return "Complete all three details about your move.";
    if (step === 2 && (!profile.budget || !profile.commuteDestination.trim()))
      return "Choose a budget and enter your main destination.";
    if (step === 3 && profile.priorities.length === 0) return "Select at least one priority.";
    return "";
  };

  const next = () => {
    const message = validate();
    if (message) return setError(message);
    setStep((current) => Math.min(current + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restart = () => {
    setProfile(emptyProfile);
    setSelectedIndex(0);
    setError("");
    setStep(0);
  };

  return (
    <main>
      {step === 0 ? (
        <>
          <header className="topbar">
            <a className="brand" href="#top" aria-label="Neighborhood Analytics home">
              <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
              <span><b>Neighborhood</b><small>Analytics</small></span>
            </a>
            <div className="pilot-status"><span className="live-dot" aria-hidden="true" /><span className="pilot-pill">Vancouver pilot</span></div>
          </header>

          <section className="login-shell" id="top">
            <div className="login-hero">
              <div className="brand-lockup">
                <div className="city-scan" aria-hidden="true"><span className="scan-ring ring-one" /><span className="scan-ring ring-two" /><i className="scan-core" /><i className="scan-node node-one" /><i className="scan-node node-two" /><i className="scan-node node-three" /></div>
                <h1><span>Neighborhood</span><em>Analytics</em></h1>
              </div>
              <p className="login-byline">by Mumbi Infrastructure Systems Ltd</p>
              <p>
                A smarter approach to urban settlement.
              </p>
            </div>

            <aside className="login-panel">
              <div className="login-card">
                <h2>Log in to Neighborhood Analytics</h2>
                <label>
                  Email or mobile number
                  <input placeholder="Email or mobile number" />
                </label>
                <label>
                  Password
                  <input type="password" placeholder="Password" />
                </label>
                <button className="button login-button" onClick={() => setStep(1)}>Log in</button>
                <a className="forgot-link" href="#top">Forgot password?</a>
                <button className="button outline-button" onClick={() => setStep(1)}>Create new account</button>
              </div>
            </aside>
          </section>

        </>
      ) : (
        <>
          <header className="topbar">
            <a className="brand" href="#top" aria-label="Neighborhood Analytics home">
              <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
              <span><b>Neighborhood</b><small>Analytics</small></span>
            </a>
            <div className="pilot-status"><span className="live-dot" aria-hidden="true" /><span className="pilot-pill">Vancouver pilot</span></div>
          </header>

          <section className="progress-wrap" aria-label="Your progress">
            <div className="progress-copy"><span>Step {step + 1} of 5</span><strong>{steps[step]}</strong></div>
            <div className="progress-track"><span style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
          </section>

          {step < 4 ? (
            <section className="journey" id="top">
              <div className="intro-panel">
                <p className="eyebrow">Make your next move feel settled</p>
                <h1>{step === 0 ? "Find a neighborhood that fits your life." : `Welcome, ${profile.firstName}`}</h1>
                <p className="lede">
                  {step === 0
                    ? "In a galaxy full of options, we are here to make the choice feel right. Tell us more about your move."
                    : "In a galaxy full of options, we are here to make the choice feel right. Tell us more about your move."}
                </p>
                <div className="city-scan" aria-hidden="true"><span className="scan-ring ring-one" /><span className="scan-ring ring-two" /><i className="scan-core" /><i className="scan-node node-one" /><i className="scan-node node-two" /><i className="scan-node node-three" /></div>
              </div>

              <div className="form-card" key={step}>
                {step === 0 && <Welcome profile={profile} update={update} />}
                {step === 1 && <Move profile={profile} update={update} />}
                {step === 2 && <Needs profile={profile} update={update} />}
                {step === 3 && <Priorities profile={profile} />}
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="form-actions">
                  {step > 0 && <button className="button ghost" onClick={() => setStep(step - 1)}>Back</button>}
                  <button className="button primary" onClick={next}>{step === 3 ? "See my shortlist" : "Continue"}<span>→</span></button>
                </div>
                <p className="privacy-note">No password. No personal data is saved or sent.</p>
              </div>
            </section>
          ) : (
            <section className="results-page" id="top">
              <div className="results-heading">
                <div><p className="eyebrow">Your Vancouver shortlist</p><h1>Three places worth exploring, {profile.firstName}.</h1></div>
                <p>Ranked around {profile.priorities.map((p) => PRIORITY_LABELS[p].toLowerCase()).join(", ")}. Select a marker or card to compare.</p>
              </div>

              <div className="demo-notice"><b>Illustrative demo</b><span>Scores and rental ranges are curated examples, not live market or safety advice.</span></div>

              <div className="results-grid">
                <NeighborhoodMap recommendations={recommendations} selectedIndex={selectedIndex} onSelect={setSelectedIndex} destination={profile.commuteDestinationCoords} />
                <aside className="active-summary" aria-live="polite">
                  <span className="rank-chip">#{selectedIndex + 1} match</span>
                  <div className="score-ring" style={{ "--score": recommendations[selectedIndex].match } as React.CSSProperties}><b>{recommendations[selectedIndex].match}%</b><small>match</small></div>
                  <h2>{recommendations[selectedIndex].neighborhood.name}</h2>
                  <p>{recommendations[selectedIndex].neighborhood.tagline}</p>
                  <dl><div><dt>Illustrative rent</dt><dd>${recommendations[selectedIndex].neighborhood.rentMin.toLocaleString()}–${recommendations[selectedIndex].neighborhood.rentMax.toLocaleString()}</dd></div><div><dt>Best for</dt><dd>{recommendations[selectedIndex].topCategories.map((p) => PRIORITY_LABELS[p]).join(" · ")}</dd></div></dl>
                  <PriorityOverlap recommendation={recommendations[selectedIndex]} />
                  <div className="park-summary"><b>{recommendations[selectedIndex].neighborhood.nearbyParks?.length ?? 0} major parks within 500 m</b><span>{recommendations[selectedIndex].neighborhood.nearbyParks?.slice(0, 3).map((park) => park.name).join(" · ") || "No major parks in the immediate area."}</span>{(recommendations[selectedIndex].neighborhood.accessibleParks?.length ?? 0) > 0 && <small>Plus {recommendations[selectedIndex].neighborhood.accessibleParks?.length} more within 1 km.</small>}{(recommendations[selectedIndex].neighborhood.destinationParks?.length ?? 0) > 0 && <small>Destination parks: {recommendations[selectedIndex].neighborhood.destinationParks?.slice(0, 2).map((park) => park.name).join(" · ")}</small>}</div>
                  <div className="transit-summary"><b>Transit access</b><span>{recommendations[selectedIndex].neighborhood.transitAccess?.stopCount ?? 0} stops · {recommendations[selectedIndex].neighborhood.transitAccess?.routeCount ?? 0} routes · {recommendations[selectedIndex].neighborhood.transitAccess?.stationCount ?? 0} stations nearby</span></div>
                </aside>
              </div>

              <div className="cards" aria-label="Neighborhood comparisons">
                {recommendations.map((item, index) => (
                  <button key={item.neighborhood.id} style={{ "--delay": `${index * 90}ms` } as React.CSSProperties} className={`result-card ${selectedIndex === index ? "selected" : ""}`} onClick={() => setSelectedIndex(index)}>
                    <div className="card-top"><span>0{index + 1}</span><strong>{item.match}% match</strong></div>
                    <h3>{item.neighborhood.name}</h3><p>{item.neighborhood.tagline}</p><span className="card-park-count">{item.neighborhood.nearbyParks?.length ?? 0} major parks within 500 m</span>
                    <div className="rating-list">
                      {profile.priorities.map((priority) => <div key={priority}><span>{PRIORITY_LABELS[priority]}</span><i><em style={{ width: `${item.categoryScores[priority] * 10}%` }} /></i><b>{item.categoryScores[priority]}/10</b></div>)}
                    </div>
                    <div className="card-overlap"><b>{item.overlapScore}/10</b><span>{item.overlapStrength}</span></div>
                    <div className="insight good"><span>Why it matches</span><p>{item.why}</p></div>
                    <div className="insight tradeoff"><span>Consider this</span><p>{item.consider}</p></div>
                  </button>
                ))}
              </div>

              <div className="results-actions"><button className="button ghost" onClick={() => setStep(1)}>← Revise answers</button><button className="button primary" onClick={restart}>Start again</button></div>
            </section>
          )}
        </>
      )}

      <footer><span>Mumbi Infrastructure Systems Ltd.</span><span>Neighborhood Analytics · 2026</span></footer>
    </main>
  );
}

type Update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;

function Welcome({ profile, update }: { profile: UserProfile; update: Update }) {
  return <><p className="step-kicker">Let’s begin</p><h2>What should we call you?</h2><label>First name<input autoFocus autoComplete="given-name" value={profile.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="e.g. Mumbi" /></label><p className="field-help">We’ll use your name only to personalize this session.</p></>;
}

function PriorityOverlap({ recommendation }: { recommendation: ReturnType<typeof createRecommendations>[number] }) {
  const factors = recommendation.factorEvidence.slice(0, 3);

  return (
    <section className={`priority-overlap factor-count-${factors.length}`} aria-label="Selected priority overlap">
      <div className="overlap-head">
        <span>Priority overlap</span>
        <b>{recommendation.overlapScore}/10</b>
      </div>
      <div className="venn-wrap" aria-hidden="true">
        {factors.map((factor, index) => (
          <i key={factor.factor} className={`venn-circle venn-${index}`} style={{ "--factor-score": factor.score } as React.CSSProperties}>
            <span>{factor.label}</span>
          </i>
        ))}
        <strong>{recommendation.overlapStrength}</strong>
      </div>
      <div className="factor-evidence">
        {factors.map((factor) => (
          <div key={factor.factor}>
            <b>{factor.label}</b>
            <span>{factor.detail}</span>
            <small>{factor.source} · {factor.confidence}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Move({ profile, update }: { profile: UserProfile; update: Update }) {
  return (
    <>
      <p className="step-kicker">Help Me Settle!</p>
      <div className="from-to-grid">
        <label>
          From
          <input
            value={profile.currentCity}
            onChange={(e) => update("currentCity", e.target.value)}
            placeholder="e.g. Toronto"
          />
        </label>
        <label>
          To
          <span className="input-watermark" aria-hidden="true">Vancouver, BC</span>
          <input
            value={profile.destination}
            onChange={(e) => update("destination", e.target.value)}
            placeholder="e.g. Vancouver, BC"
            className="watermarked-input"
          />
        </label>
      </div>
      <fieldset>
        <legend>Type of house</legend>
        <div className="option-list">
          {HOUSING_OPTIONS.map((option) => (
            <Choice
              key={option}
              kind="row"
              active={profile.housingType === option}
              onClick={() => update("housingType", option)}
            >
              {option}
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Reason for stay</legend>
        <div className="option-list">
          {REASON_OPTIONS.map((option) => (
            <Choice
              key={option}
              kind="row"
              active={profile.reason === option}
              onClick={() => update("reason", option)}
            >
              {option}
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>My priority factors</legend>
        <p className="field-help">Select up to three factors.</p>
        <div className="option-list factors">
          {PRIORITY_OPTIONS.map((priority) => (
            <Choice
              key={priority}
              kind="row"
              active={profile.priorities.includes(priority)}
              disabled={!profile.priorities.includes(priority) && profile.priorities.length >= 3}
              onClick={() => {
                const isSelected = profile.priorities.includes(priority);
                if (isSelected) {
                  update("priorities", profile.priorities.filter((item) => item !== priority));
                } else if (profile.priorities.length < 3) {
                  update("priorities", [...profile.priorities, priority]);
                }
              }}
            >
              <span className="priority-icon" aria-hidden="true">
                {({ affordability: "$", transit: "↗", security: "◇", greenSpace: "✦", nightlife: "☾", schools: "A", walkability: "◎" } as Record<Priority, string>)[priority]}
              </span>
              {PRIORITY_LABELS[priority]}
            </Choice>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function Needs({ profile, update }: { profile: UserProfile; update: Update }) {
  const [geocodeState, setGeocodeState] = useState<"idle" | "matching" | "found" | "not-found">("idle");
  const geocodeTimer = useRef<number | null>(null);

  useEffect(() => () => { if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current); }, []);

  const handleCommuteDestinationChange = (value: string) => {
    update("commuteDestination", value);
    if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current);
    const text = value.trim();
    if (!text) {
      update("commuteDestinationCoords", null);
      setGeocodeState("idle");
      return;
    }
    const curated = findDestination(text);
    if (curated) {
      update("commuteDestinationCoords", curated);
      setGeocodeState("found");
      return;
    }
    setGeocodeState("matching");
    geocodeTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ca&q=${encodeURIComponent(`${text} Metro Vancouver`)}`);
        const places = await res.json();
        const best = Array.isArray(places) ? places[0] : undefined;
        if (best?.lat && best?.lon) {
          update("commuteDestinationCoords", {
            lat: parseFloat(best.lat),
            lon: parseFloat(best.lon),
            label: best.display_name as string,
            query: text,
            resolvedName: best.display_name as string,
            source: "geocoder",
            confidence: "likely",
          });
          setGeocodeState("found");
        } else {
          update("commuteDestinationCoords", null);
          setGeocodeState("not-found");
        }
      } catch {
        update("commuteDestinationCoords", null);
        setGeocodeState("not-found");
      }
    }, 650);
  };

  const resolvedLabel = profile.commuteDestinationCoords?.label ?? (profile.commuteDestination.trim() || null);
  const showFound = profile.commuteDestinationCoords != null;

  return (
    <>
      <p className="step-kicker">Your practical needs</p>
      <h2>Set the boundaries of your search.</h2>
      <fieldset>
        <legend>Monthly housing budget</legend>
        <div className="option-list budget">{["Under $2,200", "$2,200–$2,700", "$2,700–$3,200", "$3,200+"].map((option) => <Choice key={option} kind="row" active={profile.budget === option} onClick={() => update("budget", option)}>{option}</Choice>)}</div>
      </fieldset>
      <label>Main commute destination
        <input value={profile.commuteDestination} onChange={(e) => handleCommuteDestinationChange(e.target.value)} placeholder="e.g. Downtown Vancouver, UBC, VGH" />
      </label>
      {profile.commuteDestination.trim() && (
        geocodeState === "matching" ? <p className="destination-hint">Locating that destination…</p>
          : showFound ? <p className="destination-hint found">✓ {resolvedLabel}</p>
            : geocodeState === "not-found" ? <p className="destination-hint warn">Destination not found — results won&apos;t be filtered by commute.</p>
              : null
      )}
    </>
  );
}

function Priorities({ profile }: { profile: UserProfile }) {
  const icon = ({ affordability: "$", transit: "↗", security: "◇", greenSpace: "✦", nightlife: "☾", schools: "A", walkability: "◎" } as Record<Priority, string>);
  const show = (value: string, icon: string) => (
    <div className="choice row active" aria-pressed="true">
      <span className="checkbox" aria-hidden="true">✓</span>
      <span className="choice-label"><span className="priority-icon" aria-hidden="true">{icon}</span>{value}</span>
    </div>
  );
  return <>
    <p className="step-kicker">What matters most</p>
    <h2>Here’s what will shape your shortlist.</h2>
    <fieldset>
      <legend>Reason for stay</legend>
      <div className="option-list">{show(profile.reason, "★")}</div>
    </fieldset>
    <fieldset>
      <legend>Type of house</legend>
      <div className="option-list">{show(profile.housingType, "⌂")}</div>
    </fieldset>
    <fieldset>
      <legend>My priority factors</legend>
      {profile.priorities.length > 0 ? (<div className="option-list factors">{profile.priorities.map((priority) => <div key={priority} className="choice row active" aria-pressed="true"><span className="checkbox" aria-hidden="true">✓</span><span className="choice-label"><span className="priority-icon" aria-hidden="true">{icon[priority]}</span>{PRIORITY_LABELS[priority]}</span></div>)}</div>) : (<p className="field-help">No priorities selected yet — head back and pick up to three factors that matter to you.</p>)}
    </fieldset>
    <div className="transparency"><b>How ranking works</b><p>Your selected priorities receive the most weight. Budget fit adjusts affordability, while all other categories keep a small baseline influence.</p></div>
  </>;
}

function Choice({ kind = "pill", active, disabled, onClick, children }: { kind?: "pill" | "row"; active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`choice ${kind} ${active ? "active" : ""}`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="checkbox" aria-hidden="true">
        {active ? "✓" : ""}
      </span>
      <span className="choice-label">{children}</span>
    </button>
  );
}
