"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { ModerationRuleRow } from "@/lib/queries/admin";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

export function RulesManager({ rules }: { rules: ModerationRuleRow[] }) {
  const router = useRouter();
  const approveRule = rules.find((r) => r.rule_type === "auto_approve");
  const rejectRule = rules.find((r) => r.rule_type === "auto_reject");
  const blockedRules = rules.filter((r) => r.rule_type === "keyword_block");
  const flaggedRules = rules.filter((r) => r.rule_type === "keyword_flag");

  const [approveThreshold, setApproveThreshold] = useState(
    (approveRule?.condition.min_ai_score as number | undefined) ?? 0.85
  );
  const [rejectThreshold, setRejectThreshold] = useState(
    (rejectRule?.condition.max_ai_score as number | undefined) ?? 0.5
  );
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [blockedInput, setBlockedInput] = useState("");
  const [flaggedInput, setFlaggedInput] = useState("");

  async function saveThresholds() {
    setSavingThresholds(true);
    try {
      if (approveRule) {
        await fetch("/api/admin/rules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: approveRule.id, condition: { min_ai_score: approveThreshold } }),
        });
      } else {
        await fetch("/api/admin/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleType: "auto_approve", condition: { min_ai_score: approveThreshold }, action: "approve" }),
        });
      }
      if (rejectRule) {
        await fetch("/api/admin/rules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rejectRule.id, condition: { max_ai_score: rejectThreshold } }),
        });
      } else {
        await fetch("/api/admin/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleType: "auto_reject", condition: { max_ai_score: rejectThreshold }, action: "reject" }),
        });
      }
      router.refresh();
    } finally {
      setSavingThresholds(false);
    }
  }

  async function addKeyword(ruleType: "keyword_block" | "keyword_flag", keyword: string) {
    if (!keyword.trim()) return;
    await fetch("/api/admin/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleType, condition: { keyword: keyword.trim().toLowerCase() }, action: ruleType === "keyword_block" ? "reject" : "flag_for_review" }),
    });
    if (ruleType === "keyword_block") setBlockedInput("");
    else setFlaggedInput("");
    router.refresh();
  }

  async function removeRule(id: string) {
    await fetch("/api/admin/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <p className="label-mono">Umbrales de auto-moderación</p>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Auto-aprobar si score ≥</span>
              <span className="font-mono">{approveThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={approveThreshold}
              onChange={(e) => setApproveThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Auto-rechazar si score &lt;</span>
              <span className="font-mono">{rejectThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={rejectThreshold}
              onChange={(e) => setRejectThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <Button size="sm" onClick={saveThresholds} loading={savingThresholds}>
            Guardar umbrales
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <p className="label-mono">Palabras bloqueadas (rechazo automático)</p>
          <div className="flex flex-wrap gap-2">
            {blockedRules.map((r) => (
              <span key={r.id} className="flex items-center gap-1 bg-danger/10 text-danger text-xs rounded-full px-2.5 py-1">
                {r.condition.keyword as string}
                <button onClick={() => removeRule(r.id)} className="cursor-pointer">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Añadir palabra…" value={blockedInput} onChange={(e) => setBlockedInput(e.target.value)} />
            <Button size="sm" onClick={() => addKeyword("keyword_block", blockedInput)}>
              Añadir
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <p className="label-mono">Palabras que fuerzan revisión manual</p>
          <div className="flex flex-wrap gap-2">
            {flaggedRules.map((r) => (
              <span key={r.id} className="flex items-center gap-1 bg-warning/10 text-warning text-xs rounded-full px-2.5 py-1">
                {r.condition.keyword as string}
                <button onClick={() => removeRule(r.id)} className="cursor-pointer">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Añadir palabra…" value={flaggedInput} onChange={(e) => setFlaggedInput(e.target.value)} />
            <Button size="sm" onClick={() => addKeyword("keyword_flag", flaggedInput)}>
              Añadir
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
