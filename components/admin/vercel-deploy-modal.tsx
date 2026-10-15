"use client";

import React, { useState } from "react";
import {
  X,
  Server,
  Lock,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import type { VercelModalConfig, VercelDeployResult } from "./types";

interface VercelDeployModalProps {
  config: VercelModalConfig;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: VercelDeployResult) => void;
  showToast: (text: string, type: "success" | "error") => void;
}

export function VercelDeployModal({
  config,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: VercelDeployModalProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [customVars, setCustomVars] = useState<Array<{ key: string; required: boolean }>>([]);
  const [newKey, setNewKey] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<VercelDeployResult | null>(null);

  if (!isOpen) return null;

  const allVars = [
    ...config.envVariables,
    ...customVars.map((c) => ({
      key: c.key,
      required: c.required,
      description: "Custom user variable",
      isSecret: true,
    })),
  ];

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!clean) return;
    if (allVars.some((v) => v.key === clean)) {
      showToast("Variable key already exists.", "error");
      return;
    }
    setCustomVars([...customVars, { key: clean, required: false }]);
    setNewKey("");
  };

  const handleRemoveCustom = (keyToRemove: string) => {
    setCustomVars(customVars.filter((c) => c.key !== keyToRemove));
    const nextValues = { ...formValues };
    delete nextValues[keyToRemove];
    setFormValues(nextValues);
  };

  const handleTriggerDeploy = async () => {
    setIsDeploying(true);
    setStatusMessage("Linking GitHub repo with Vercel project...");

    try {
      const envPayload = Object.entries(formValues)
        .filter(([, val]) => val && val.trim().length > 0)
        .map(([key, value]) => ({
          key,
          value,
          isSecret: true,
        }));

      setStatusMessage("Provisioning environment variables on Vercel...");
      const res = await fetch("/api/admin/vercel/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: config.repoFullName,
          branch: config.branch || "main",
          envVariables: envPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vercel deployment failed.");

      setDeployResult(data);
      onSuccess(data);
      showToast("Vercel deployment triggered & live URL ready!", "success");
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to deploy to Vercel.",
        "error"
      );
    } finally {
      setIsDeploying(false);
      setStatusMessage(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeploying) onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Configure &amp; Deploy to Vercel
              </h3>
              <p dir="ltr" className="text-xs font-mono text-neutral-400 text-left">
                {config.repoFullName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeploying}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {deployResult ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Deployment Dispatched!
              </h4>
              <p className="text-xs text-neutral-500">
                Your repository has been linked to Vercel and production build was triggered.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-xs">
              <span className="text-neutral-400 block mb-1">Live URL:</span>
              <a
                href={deployResult.liveUrl}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1.5"
              >
                <span>{deployResult.liveUrl}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Provision required environment variables. Secrets will be securely saved directly into your Vercel project settings before deployment.
            </p>

            {/* Variable List */}
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pe-1">
              {allVars.length > 0 ? (
                allVars.map((item) => {
                  const isRevealed = revealedSecrets[item.key];
                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            dir="ltr"
                            className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 text-left"
                          >
                            {item.key}
                          </span>
                          {item.required && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Required
                            </span>
                          )}
                        </div>

                        {customVars.some((c) => c.key === item.key) && (
                          <CustomTooltip content="Remove variable" side="top">
                            <button
                              type="button"
                              onClick={() => handleRemoveCustom(item.key)}
                              className="text-neutral-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </CustomTooltip>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type={isRevealed ? "text" : "password"}
                          dir="ltr"
                          placeholder={item.description || "Enter variable value..."}
                          value={formValues[item.key] || ""}
                          onChange={(e) =>
                            setFormValues({ ...formValues, [item.key]: e.target.value })
                          }
                          className="w-full ps-3 pe-8 py-2 text-xs font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedSecrets({
                              ...revealedSecrets,
                              [item.key]: !revealedSecrets[item.key],
                            })
                          }
                          className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                  No required backend keys detected.
                </div>
              )}
            </div>

            {/* Add Custom Variable Row */}
            <form onSubmit={handleAddCustom} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                dir="ltr"
                placeholder="ADD_CUSTOM_ENV_KEY..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white uppercase"
              />
              <button
                type="submit"
                className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Key</span>
              </button>
            </form>

            {/* Status if deploying */}
            {statusMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-500/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeploying}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerDeploy}
                disabled={isDeploying}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deploying...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5" />
                    <span>Trigger Deployment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
