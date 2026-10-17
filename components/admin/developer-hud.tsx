"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Terminal,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Trash2,
  Radio,
  Clock,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { useTelemetryStore } from "@/lib/stores/use-telemetry-store";
import type { TelemetryStreamEvent, TelemetrySource } from "@/types/api";

export function DeveloperHud() {
  const {
    isTelemetryEnabled,
    isHudOpen,
    connectionStatus,
    events,
    stats,
    setIsTelemetryEnabled,
    toggleTelemetry,
    setIsHudOpen,
    toggleHud,
    clearEvents,
  } = useTelemetryStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [filterSource, setFilterSource] = useState<TelemetrySource | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Global Keyboard Shortcut: Ctrl+Shift+H / Cmd+Shift+H
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "H" || e.key === "h")) {
        e.preventDefault();
        setIsMinimized(false);
        toggleHud();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleHud]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSource = filterSource === "ALL" || ev.source === filterSource;
      const matchesSearch =
        !searchQuery ||
        ev.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.entityType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSource && matchesSearch;
    });
  }, [events, filterSource, searchQuery]);

  // Color helpers
  const getSourceBadge = (source: TelemetrySource) => {
    switch (source) {
      case "DB_CACHE":
        return {
          label: "DB_CACHE",
          icon: Database,
          classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        };
      case "GEMINI_SYNTHESIS":
        return {
          label: "GEMINI_AI",
          icon: Cpu,
          classes: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        };
      case "GITHUB_API":
        return {
          label: "GITHUB_API",
          icon: Github,
          classes: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        };
      default:
        return {
          label: source,
          icon: Activity,
          classes: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  // If HUD is closed, render nothing
  if (!isHudOpen) {
    return null;
  }

  // When HUD is minimized, render the compact floating pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 end-4 z-50 flex items-center gap-1.5 group/pill">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/80 shadow-2xl backdrop-blur-md transition-all text-xs font-mono active:scale-95 cursor-pointer"
          title="Expand Developer HUD"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-emerald-400 animate-pulse"
                : connectionStatus === "reconnecting"
                ? "bg-amber-400 animate-ping"
                : "bg-neutral-500"
            }`}
          />
          <span className="font-bold text-neutral-300">HUD</span>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
            {stats.hitRatePercent}% HIT
          </span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            ({stats.total} evts)
          </span>
          <Maximize2 className="w-3 h-3 text-neutral-400 group-hover:text-neutral-200" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsHudOpen(false);
          }}
          className="p-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 border border-neutral-700/80 shadow-xl transition-all cursor-pointer opacity-70 group-hover/pill:opacity-100"
          title="Close HUD"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 end-4 z-50 flex flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 text-neutral-100 shadow-2xl backdrop-blur-xl font-mono transition-all duration-200 overflow-hidden w-[94vw] sm:w-[540px] md:w-[600px] h-[520px] max-h-[85vh]"
    >
      {/* HUD Header */}
      <div className="px-4 py-3 bg-neutral-900/80 border-b border-neutral-800/80 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-neutral-800 text-primary">
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-neutral-100">
                TELEMETRY HUD
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold border flex items-center gap-1 leading-none ${
                  connectionStatus === "connected"
                    ? "bg-emerald-950/80 text-emerald-400 border-emerald-700/60"
                    : connectionStatus === "reconnecting"
                    ? "bg-amber-950/80 text-amber-400 border-amber-700/60 animate-pulse"
                    : "bg-neutral-800 text-neutral-400 border-neutral-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-emerald-400 animate-pulse"
                      : connectionStatus === "reconnecting"
                      ? "bg-amber-400"
                      : "bg-neutral-500"
                  }`}
                />
                <span>{connectionStatus}</span>
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-sans">
              Press <kbd className="px-1 py-0.2 bg-neutral-800 rounded text-[9px]">Ctrl+Shift+H</kbd> to toggle
            </p>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1.5 text-neutral-400">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="p-1.5 rounded-lg hover:bg-neutral-800 hover:text-neutral-200 transition-colors cursor-pointer"
            title="Minimize HUD"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsHudOpen(false);
            }}
            className="p-1.5 rounded-lg hover:bg-neutral-800 hover:text-rose-400 transition-colors cursor-pointer"
            title="Close HUD"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Real-time Metrics Deck */}
          <div className="p-3 bg-neutral-900/40 border-b border-neutral-800/80 space-y-2 shrink-0">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-[10px] text-neutral-400 block font-sans">Cache Hit Rate</span>
                <span className="text-sm font-bold text-emerald-400">{stats.hitRatePercent}%</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-[10px] text-neutral-400 block font-sans">DB Hits</span>
                <span className="text-sm font-bold text-emerald-300">{stats.dbHits}</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-[10px] text-neutral-400 block font-sans">AI Syntheses</span>
                <span className="text-sm font-bold text-cyan-400">{stats.geminiCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-[10px] text-neutral-400 block font-sans">Avg Latency</span>
                <span className="text-sm font-bold text-amber-300">{stats.avgLatencyMs}ms</span>
              </div>
            </div>

            {/* Visual Proportion Bar */}
            {stats.total > 0 && (
              <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(stats.dbHits / stats.total) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`DB Cache: ${stats.dbHits}`}
                />
                <div
                  style={{ width: `${(stats.geminiCount / stats.total) * 100}%` }}
                  className="bg-cyan-500 transition-all duration-300"
                  title={`Gemini: ${stats.geminiCount}`}
                />
                <div
                  style={{ width: `${(stats.githubCount / stats.total) * 100}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`GitHub: ${stats.githubCount}`}
                />
              </div>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div className="px-3 py-2 bg-neutral-900/20 border-b border-neutral-800/80 flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by key (e.g. react, vercel/next)..."
                className="w-full ps-8 pe-3 py-1 text-[11px] bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>

            {/* Source Filter Selectors */}
            <div className="flex items-center gap-1">
              {(["ALL", "DB_CACHE", "GEMINI_SYNTHESIS", "GITHUB_API"] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setFilterSource(src)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                    filterSource === src
                      ? "bg-neutral-800 text-neutral-100 border-neutral-600"
                      : "bg-transparent text-neutral-500 border-transparent hover:text-neutral-300"
                  }`}
                >
                  {src === "ALL"
                    ? "ALL"
                    : src === "DB_CACHE"
                    ? "DB"
                    : src === "GEMINI_SYNTHESIS"
                    ? "AI"
                    : "GH"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearEvents}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 transition-colors"
              title="Clear Event Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Event Stream Log List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/80 p-2 space-y-1">
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs">
                <Radio className="w-6 h-6 mx-auto mb-2 opacity-40 animate-pulse text-emerald-500" />
                <p>Waiting for real-time resolution events...</p>
                <p className="text-[10px] text-neutral-600 mt-1">
                  Trigger project scans or tech lookups to observe live telemetry.
                </p>
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const badge = getSourceBadge(ev.source);
                const BadgeIcon = badge.icon;
                const isExpanded = expandedEventId === ev.id;
                const timeString = new Date(ev.timestamp).toLocaleTimeString();

                return (
                  <div
                    key={ev.id}
                    className="p-2 rounded-xl hover:bg-neutral-900/50 transition-colors text-xs space-y-1.5"
                  >
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Provenance Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.classes}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>

                        {/* Entity & Key */}
                        <span className="text-[11px] font-semibold text-neutral-200 truncate">
                          <span className="text-neutral-500 uppercase text-[9px] me-1">
                            [{ev.entityType}]
                          </span>
                          {ev.key}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px]">
                        {/* Latency badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            ev.latencyMs < 500
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                              : ev.latencyMs < 3000
                              ? "bg-cyan-950/60 text-cyan-400 border-cyan-800/40"
                              : "bg-amber-950/60 text-amber-400 border-amber-800/40"
                          }`}
                        >
                          {ev.latencyMs}ms
                        </span>

                        <span className="text-[10px] text-neutral-500">{timeString}</span>

                        {/* Expand indicator */}
                        <button
                          type="button"
                          className="text-neutral-500 hover:text-neutral-300"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable JSON Inspector */}
                    {isExpanded && (
                      <div className="p-2 mt-1 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[10px] text-neutral-300 font-mono space-y-1 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-neutral-500">
                          <span>Trace ID: {ev.traceId}</span>
                          <span>Status: {ev.status}</span>
                        </div>
                        {ev.details && (
                          <pre className="p-1.5 bg-black/40 rounded border border-neutral-800 overflow-x-auto text-[10px] text-emerald-300/90 leading-tight">
                            {JSON.stringify(ev.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
