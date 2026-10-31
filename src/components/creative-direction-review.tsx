"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";

type Creator = { id: string; slug: string; name: string; personaVersions: Array<{ version: number }> };
type Assignment = {
  id: string;
  influencerSlug: string;
  direction: string;
  status: string;
  boardUrl: string;
  integrityOk: boolean;
  reviewedAt: string | null;
  creatorIds: string[];
  postIds: string[];
  photoSourceIds: string[];
  evidenceSnapshot: {
    creators: Array<{ id: string; name: string; handle: string | null; profileUrl: string; evidenceUrl: string; evidenceType: string; reusableFormat: string }>;
    posts: Array<{ id: string; title: string; evidenceLevel: string; url: string; sourceUrl: string; reusableStructure: string }>;
    photos: Array<{ id: string; title: string; sourceUrl: string; licenseUrl: string; licenseClaim: string; attribution: string; bytesIncluded: boolean }>;
  };
};
type IdentityAsset = { id: string; influencerId: string; kind: string; byteSize: number; sha256: string; rightsBasis: string; status: string; reviewedAt: string | null; createdAt: string; fileUrl: string; personaVersion: { version: number }; influencer: { name: string; slug: string } };

export default function CreativeDirectionReview({ creators, onChanged }: { creators: Creator[]; onChanged: () => Promise<void> }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assets, setAssets] = useState<IdentityAsset[]>([]);
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [kind, setKind] = useState("face");
  const [file, setFile] = useState<File | null>(null);
  const [rightsBasis, setRightsBasis] = useState("owner_created_fictional_character");
  const [rightsNotes, setRightsNotes] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [assignmentResponse, assetResponse] = await Promise.all([
      fetch("/api/creative-assignments", { cache: "no-store" }),
      fetch("/api/identity-assets", { cache: "no-store" })
    ]);
    if (assignmentResponse.status === 401 || assetResponse.status === 401) { window.location.assign("/login"); return; }
    const [assignmentData, assetData] = await Promise.all([assignmentResponse.json(), assetResponse.json()]);
    if (!assignmentResponse.ok || !assetResponse.ok) throw new Error(assignmentData.error || assetData.error || "Could not load creative direction review.");
    setAssignments(assignmentData.assignments ?? []);
    setAssets(assetData.assets ?? []);
  }, []);

  useEffect(() => { refresh().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load review data.")); }, [refresh]);

  async function reviewAssignment(assignment: Assignment, decision: "approved" | "rejected") {
    const label = decision === "approved" ? "Approve" : "Reject";
    if (!window.confirm(`${label} the exact ${assignment.id} direction and its listed sources for ${assignment.influencerSlug}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/creative-assignments/${encodeURIComponent(assignment.id)}/review`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, ownerConfirmedId: assignment.id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Review failed (${response.status})`);
      setMessage(`${assignment.id} ${decision}. Its saved sources remain locked.`);
      await refresh(); await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save assignment review."); }
    finally { setBusy(false); }
  }

  async function uploadReference(event: FormEvent) {
    event.preventDefault();
    if (!file) { setError("Choose an original fictional-character image first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const data = new FormData();
      data.set("influencerId", creatorId); data.set("kind", kind); data.set("rightsBasis", rightsBasis);
      data.set("rightsNotes", rightsNotes); data.set("rightsConfirmed", String(rightsConfirmed)); data.set("file", file);
      const response = await fetch("/api/identity-assets", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Upload failed (${response.status})`);
      setMessage("Identity reference uploaded as pending review. It is private to this admin workspace.");
      setFile(null); setRightsNotes(""); setRightsConfirmed(false);
      const input = document.getElementById("identity-reference-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh(); await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not upload identity reference."); }
    finally { setBusy(false); }
  }

  async function reviewAsset(asset: IdentityAsset, decision: "approved" | "rejected") {
    const label = decision === "approved" ? "Approve" : "Reject";
    if (!window.confirm(`${label} this ${asset.kind} reference for ${asset.influencer.name}, persona v${asset.personaVersion.version}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/identity-assets/${asset.id}/review`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Review failed (${response.status})`);
      setMessage(`${asset.kind} reference ${decision} for persona v${asset.personaVersion.version}.`);
      await refresh(); await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save image review."); }
    finally { setBusy(false); }
  }

  const selectedCreator = creators.find((creator) => creator.id === creatorId);
  const currentAssets = assets.filter((asset) => asset.influencerId === creatorId && asset.personaVersion.version === selectedCreator?.personaVersions[0]?.version);
  const approvedFace = currentAssets.some((asset) => asset.kind === "face" && asset.status === "approved");
  const approvedBody = currentAssets.some((asset) => asset.kind === "body" && asset.status === "approved");

  return <>
    <section className="page-heading"><div><div className="eyebrow">OWNER DECISIONS / LOCKED RESEARCH PACK</div><h1>Choose the direction before production.</h1><p>All six directions are proposals awaiting your explicit review. Source sets are locked to the curated pack; the SVG boards are original illustrations, not face or body references.</p></div><span className="evidence-chip">NO AUTO-APPROVAL</span></section>
    {message && <div className="notice success-notice" role="status">{message}</div>}{error && <div className="notice error-notice" role="alert">{error}</div>}
    <div className="assignment-grid">
      {assignments.map((assignment) => <article className="panel assignment-card" key={assignment.id}>
        <div className="assignment-board"><img src={assignment.boardUrl} alt={`Original illustration for proposed direction ${assignment.id}`} /><span>ORIGINAL SVG ILLUSTRATION · NOT A CHARACTER REFERENCE</span></div>
        <div className="assignment-body"><div className="assignment-title"><div><div className="eyebrow">{assignment.id} · {assignment.influencerSlug}</div><h2>{assignment.id}</h2></div><span className={`status-pill status-${assignment.status}`}>{assignment.status.replaceAll("_", " ")}</span></div>
          <p>{assignment.direction}</p>
          {!assignment.integrityOk && <div className="form-note error-note">The saved source set differs from the locked pack. Review and use are disabled.</div>}
          <details className="assignment-evidence"><summary>Inspect linked evidence · {assignment.creatorIds.length} creators · {assignment.postIds.length} post examples · {assignment.photoSourceIds.length} photo source pages</summary>
            <div className="evidence-list"><h3>Creator references</h3>{assignment.evidenceSnapshot.creators.map((creator) => <div key={creator.id}><strong>{creator.id} · {creator.name} {creator.handle || "· handle unverified"}</strong><small>{creator.evidenceType.replaceAll("_", " ")} · {creator.reusableFormat}</small><a href={creator.profileUrl} target="_blank" rel="noreferrer">Profile ↗</a><a href={creator.evidenceUrl} target="_blank" rel="noreferrer">Listing/evidence ↗</a></div>)}
              <h3>Post examples</h3>{assignment.evidenceSnapshot.posts.length === 0 ? <small>No individual post URL was supplied for this direction.</small> : assignment.evidenceSnapshot.posts.map((post) => <div key={post.id}><strong>{post.id} · {post.title}</strong><small>{post.evidenceLevel.replaceAll("_", " ")} · {post.reusableStructure}</small><a href={post.url} target="_blank" rel="noreferrer">{post.evidenceLevel === "direct_video" ? "Open direct video" : "Open index page"} ↗</a></div>)}
              <h3>Photographic source pages</h3>{assignment.evidenceSnapshot.photos.length === 0 ? <small>No photographic source pages are assigned.</small> : assignment.evidenceSnapshot.photos.map((photo) => <div key={photo.id}><strong>{photo.id} · {photo.title}</strong><small>{photo.attribution} · license claim: {photo.licenseClaim} · image bytes not included</small><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Source page ↗</a><a href={photo.licenseUrl} target="_blank" rel="noreferrer">License text ↗</a></div>)}</div>
          </details>
          <div className="form-note">No source engagement values are included here. Directory and index pages are not first-party performance evidence. The pack does not license any creator's likeness, photography, or voice.</div>
          {assignment.integrityOk && <div className="assignment-actions">{assignment.status === "approved" ? <button className="button button-quiet" disabled={busy} onClick={() => reviewAssignment(assignment, "rejected")}>Revoke direction approval</button> : <><button className="button button-quiet" disabled={busy} onClick={() => reviewAssignment(assignment, "rejected")}>Reject direction</button><button className="button button-primary" disabled={busy} onClick={() => reviewAssignment(assignment, "approved")}>Review & approve {assignment.id}</button></>}</div>}
        </div>
      </article>)}
    </div>

    <section className="panel identity-review-panel">
      <div className="panel-heading"><div><div className="eyebrow">CHARACTER CANON / CURRENT PERSONA VERSION</div><h2>Upload and review original identity references</h2></div><span className="small-link">PRIVATE · AUTHENTICATED</span></div>
      <p className="setting-copy">Upload face and body references created for the fictional character, or references you are explicitly authorized to use for this character. Do not upload the curated creator photos or the SVG boards as identity canon. Fine Photo Gen generation stays blocked until both reference types are approved for the current persona version.</p>
      <div className="identity-upload-grid">
        <form className="form-stack identity-upload-form" onSubmit={uploadReference}>
          <Field label="Fictional creator"><select value={creatorId} onChange={(event) => setCreatorId(event.target.value)}>{creators.map((creator) => <option key={creator.id} value={creator.id}>{creator.name} · v{creator.personaVersions[0]?.version}</option>)}</select></Field>
          <div className="field-row"><Field label="Reference type"><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="face">Face</option><option value="body">Body proportions</option></select></Field><Field label="Rights basis"><select value={rightsBasis} onChange={(event) => setRightsBasis(event.target.value)}><option value="owner_created_fictional_character">Created for this fictional character</option><option value="authorized_reference">Authorized reference</option></select></Field></div>
          <Field label="PNG, JPEG, or WebP · max 15 MB"><input id="identity-reference-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} required /></Field>
          <Field label="Rights and identity notes"><textarea value={rightsNotes} onChange={(event) => setRightsNotes(event.target.value)} rows={3} minLength={10} required placeholder="State why this image may be used as a reference for this fictional character." /></Field>
          <label className="rights-confirm"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span>I confirm the image does not clone a real creator and I have the rights needed for this use.</span></label>
          <button className="button button-primary" disabled={busy || !file || !rightsConfirmed}>Upload private reference</button>
        </form>
        <div className="identity-status-stack"><div className="identity-canon-status"><strong>{selectedCreator?.name} · v{selectedCreator?.personaVersions[0]?.version}</strong><span><i className={approvedFace ? "approved" : "pending"} /> Face reference {approvedFace ? "approved" : "needed"}</span><span><i className={approvedBody ? "approved" : "pending"} /> Body reference {approvedBody ? "approved" : "needed"}</span>{approvedFace && approvedBody ? <small>Reviewed character canon is ready for an explicitly authorized generation request.</small> : <small>Generation is blocked until both reference types are approved.</small>}</div>
          {currentAssets.length === 0 ? <div className="empty-state compact-empty"><h3>No current-version references</h3><p>Nothing from the curated source pack is used as a face or body reference.</p></div> : <div className="identity-assets-list">{currentAssets.map((asset) => <article className="identity-asset-card" key={asset.id}><img src={asset.fileUrl} alt={`${asset.kind} identity reference for ${asset.influencer.name}`} /><div><strong>{asset.kind} · v{asset.personaVersion.version}</strong><small>{asset.status.replaceAll("_", " ")} · {(asset.byteSize / 1024).toFixed(0)} KB · SHA {asset.sha256.slice(0, 12)}</small><small>{asset.rightsBasis.replaceAll("_", " ")}</small>{asset.status !== "approved" && <button className="button button-quiet" disabled={busy} onClick={() => reviewAsset(asset, "approved")}>Review image & approve</button>}{asset.status === "approved" && <button className="text-button" disabled={busy} onClick={() => reviewAsset(asset, "rejected")}>Revoke approval</button>}</div></article>)}</div>}
        </div>
      </div>
    </section>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
