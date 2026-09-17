'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  sendSimulatorMessageAction,
  createSimulatorSessionAction,
  getSimulatorSideEffectsAction,
  type AgentInboundReply,
  type SideEffectsData,
} from './actions';
import { getChannelBadge } from '../bookings/channel-badge';
import {
  Bot,
  User as UserIcon,
  Send,
  Plus,
  Clock,
  Sparkles,
  Database,
  ShieldCheck,
  CalendarCheck,
  AlertCircle,
  Phone,
  RefreshCw,
  Layers,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface SimulatorSessionItem {
  id: string;
  channel: string;
  phone: string;
  label: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  toolIntents?: string[];
  logged?: boolean;
}

interface SimulatorChatProps {
  clinic: {
    id: string;
    name: string;
    phone: string | null;
  } | undefined;
  defaultClinicId: string;
  initialSessions: SimulatorSessionItem[];
  userRole: string;
}

const QUICK_PROMPTS = [
  {
    label: 'Book Cleaning',
    text: 'I want to book a cleaning next Tuesday',
    channel: 'whatsapp',
  },
  {
    label: 'Clinic Hours',
    text: 'What are your opening hours and where are you located?',
    channel: 'whatsapp',
  },
  {
    label: 'Emergency / Triage',
    text: 'I have severe unbearable toothache and facial swelling since yesterday',
    channel: 'voice',
  },
  {
    label: 'Request Receipt',
    text: 'Can you send me my invoice receipt?',
    channel: 'whatsapp',
  },
];

export function SimulatorChat({
  clinic,
  initialSessions,
}: SimulatorChatProps) {
  const [sessions, setSessions] = useState<SimulatorSessionItem[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessions.length > 0 ? initialSessions[0]!.id : null
  );
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [channel, setChannel] = useState<string>('whatsapp');
  const [phone, setPhone] = useState<string>('+923001234500');
  const [sessionLabel, setSessionLabel] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sideEffects, setSideEffects] = useState<SideEffectsData>({
    auditLogs: [],
    bookingRequests: [],
    handoffs: [],
  });
  const [lastSideEffectFetch, setLastSideEffectFetch] = useState<Date>(new Date());
  const [isSideEffectsLoading, setIsSideEffectsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const currentMessages = activeSessionId ? messagesBySession[activeSessionId] || [] : [];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isThinking]);

  // Sync active channel/phone when switching session
  useEffect(() => {
    if (activeSession) {
      setChannel(activeSession.channel);
      setPhone(activeSession.phone);
    }
  }, [activeSession]);

  // Refresh side effects function
  const refreshSideEffects = async (sinceIso?: string) => {
    setIsSideEffectsLoading(true);
    try {
      const result = await getSimulatorSideEffectsAction(sinceIso);
      if (result.success) {
        setSideEffects(result.data);
        setLastSideEffectFetch(new Date());
      }
    } catch {
      // ignore
    } finally {
      setIsSideEffectsLoading(false);
    }
  };

  // Initial side effect poll
  useEffect(() => {
    refreshSideEffects();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const res = await createSimulatorSessionAction({
        channel,
        phone,
        label: sessionLabel.trim() || undefined,
      });

      if (!res.success) {
        setActionError(res.error);
        return;
      }

      const newSess: SimulatorSessionItem = {
        id: res.data.id,
        channel: res.data.channel,
        phone: res.data.phone,
        label: res.data.label,
        createdAt: new Date(res.data.createdAt),
        updatedAt: new Date(),
      };

      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setShowNewModal(false);
      setMobileDrawerOpen(false);
      setSessionLabel('');
    });
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText ?? inputText;
    if (!textToSend.trim() || isThinking) return;

    let targetSessionId = activeSessionId;

    // Auto-create session if none exists
    if (!targetSessionId) {
      const res = await createSimulatorSessionAction({
        channel,
        phone,
        label: `${channel.toUpperCase()} Demo - ${phone}`,
      });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      const newSess: SimulatorSessionItem = {
        id: res.data.id,
        channel: res.data.channel,
        phone: res.data.phone,
        label: res.data.label,
        createdAt: new Date(res.data.createdAt),
        updatedAt: new Date(),
      };
      setSessions((prev) => [newSess, ...prev]);
      targetSessionId = newSess.id;
      setActiveSessionId(newSess.id);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessagesBySession((prev) => ({
      ...prev,
      [targetSessionId!]: [...(prev[targetSessionId!] || []), userMsg],
    }));

    if (!customText) {
      setInputText('');
    }
    setIsThinking(true);
    setActionError(null);

    const timeBeforeTurn = new Date(Date.now() - 5000).toISOString();

    try {
      const result = await sendSimulatorMessageAction({
        sessionId: targetSessionId,
        body: textToSend,
        channel,
        phone,
      });

      if (!result.success) {
        setActionError(result.error);
        const errorReply: ChatMessage = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: `⚠️ Error contacting Agent service: ${result.error}`,
          timestamp: new Date(),
        };
        setMessagesBySession((prev) => ({
          ...prev,
          [targetSessionId!]: [...(prev[targetSessionId!] || []), errorReply],
        }));
      } else {
        const agentReply: ChatMessage = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: result.data.reply,
          timestamp: new Date(),
          toolIntents: result.data.tool_intents,
          logged: result.data.logged,
        };
        setMessagesBySession((prev) => ({
          ...prev,
          [targetSessionId!]: [...(prev[targetSessionId!] || []), agentReply],
        }));

        // Refresh database side effects
        refreshSideEffects(timeBeforeTurn);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setActionError(msg);
    } finally {
      setIsThinking(false);
    }
  };

  const badgeInfo = getChannelBadge(channel);
  const ChannelIcon = badgeInfo.icon;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Action Error Alert */}
      {actionError && (
        <div className="flex items-center justify-between p-3 text-sm rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="hover:opacity-75 font-semibold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Sessions Sidebar (Desktop) */}
        <aside className="w-full lg:w-80 shrink-0 border border-border bg-card rounded-xl flex flex-col overflow-hidden shadow-sm hidden md:flex">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Demo Sessions
              </h2>
              <p className="text-xs text-muted-foreground">Past 24 hours</p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {sessions.length === 0 ? (
              <div className="text-center py-8 px-4 text-muted-foreground text-xs">
                <p>No active sessions.</p>
                <p className="mt-1">Click &quot;New&quot; to start a simulated patient thread.</p>
              </div>
            ) : (
              sessions.map((sess) => {
                const badge = getChannelBadge(sess.channel);
                const Icon = badge.icon;
                const isCurrent = sess.id === activeSessionId;
                return (
                  <button
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      setChannel(sess.channel);
                      setPhone(sess.phone);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5 ${
                      isCurrent
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-border/60 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-medium text-xs text-foreground truncate">
                        {sess.label || sess.phone}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.color}`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{sess.phone}</span>
                      <span>
                        {new Date(sess.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden flex">
            <div className="w-5/6 max-w-sm bg-card border-r border-border h-full p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="font-semibold text-sm">Demo Sessions</span>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setShowNewModal(true);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>
              <div className="flex-1 overflow-y-auto space-y-2">
                {sessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      setChannel(sess.channel);
                      setPhone(sess.phone);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs ${
                      sess.id === activeSessionId
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="font-medium truncate">{sess.label || sess.phone}</div>
                    <div className="text-[11px] text-muted-foreground flex justify-between mt-1">
                      <span>{sess.channel}</span>
                      <span>{sess.phone}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />
          </div>
        )}

        {/* Right Chat Panel */}
        <section className="flex-1 border border-border bg-card rounded-xl flex flex-col overflow-hidden shadow-sm min-h-[460px]">
          {/* Chat Header */}
          <div className="p-3.5 px-4 border-b border-border bg-muted/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {activeSession?.label || (activeSession ? `Simulated Patient (${activeSession.phone})` : 'AI Clinical Receptionist')}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeInfo.color}`}
                  >
                    <ChannelIcon className="w-3 h-3" />
                    {badgeInfo.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Patient Phone: <span className="font-mono">{phone}</span> | Clinic: {clinic?.name || 'Main Dental Clinic'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeSessionId) {
                    setMessagesBySession((prev) => ({ ...prev, [activeSessionId]: [] }));
                  }
                }}
                title="Clear current chat view"
                className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted/40 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Messages View */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-semibold text-foreground">Interactive AI Agent Simulator</h4>
                <p className="text-xs max-w-md mt-1">
                  Type a simulated message below to test clinical multi-turn conversations, automated slot booking, emergency triage, or clinic inquiries.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => {
                        setChannel(prompt.channel);
                        handleSendMessage(prompt.text);
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-border hover:border-primary hover:bg-primary/5 text-foreground transition-all flex items-center gap-1.5 bg-background shadow-xs"
                    >
                      <ChevronRight className="w-3 h-3 text-primary" />
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'agent' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] sm:max-w-[70%] rounded-2xl p-3.5 text-sm shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-xs'
                        : 'bg-muted/70 text-foreground border border-border rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                    {/* Agent Badges & Intention Preview */}
                    {msg.sender === 'agent' && (
                      <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {msg.toolIntents && msg.toolIntents.length > 0 ? (
                          msg.toolIntents.map((tool) => (
                            <span
                              key={tool}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border font-mono text-primary font-medium"
                            >
                              <Layers className="w-2.5 h-2.5" />
                              {tool}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground">
                            general_conversation
                          </span>
                        )}

                        {msg.logged && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                            <Database className="w-2.5 h-2.5" />
                            DB Mutated / Logged
                          </span>
                        )}

                        <span className="ml-auto text-muted-foreground text-[9px]">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-foreground/10 border border-foreground/20 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-muted/70 text-foreground border border-border rounded-2xl rounded-bl-xs p-3.5 text-xs flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  </div>
                  <span className="text-muted-foreground font-medium">AI Agent evaluating clinical tools & DB...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar (When chat is active) */}
          {currentMessages.length > 0 && (
            <div className="px-4 py-2 border-t border-border/40 bg-muted/10 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[11px] text-muted-foreground shrink-0">Demo Prompts:</span>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setChannel(p.channel);
                    handleSendMessage(p.text);
                  }}
                  className="shrink-0 px-2 py-1 rounded-md border border-border/60 hover:border-primary text-[11px] text-muted-foreground hover:text-foreground bg-background transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input & Channel Selector Bar */}
          <div className="p-3 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              {/* Channel Selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="text-xs h-9 rounded-md border border-border bg-background px-2.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="voice">AI Voice</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google Profile</option>
                </select>

                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Patient phone"
                  className="w-32 text-xs h-9 rounded-md border border-border bg-background px-2 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Message Input */}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type simulated patient message... (e.g. 'I need a dental checkup next Tuesday')"
                  disabled={isThinking}
                  className="flex-1 text-sm h-9 rounded-md border border-border bg-background px-3 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isThinking || !inputText.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Side Effects Preview (The "WOW" Moment for Clients) */}
      <section className="border border-border bg-card rounded-xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Live Database Side Effects
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time DB Sync
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Last checked: {lastSideEffectFetch.toLocaleTimeString()}
            </span>
            <button
              onClick={() => refreshSideEffects()}
              disabled={isSideEffectsLoading}
              title="Refresh database changes"
              className="p-1 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSideEffectsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Booking Requests */}
          <div className="p-3 rounded-lg border border-border/80 bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                Booking Requests
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
                {sideEffects.bookingRequests.length} recent
              </span>
            </div>

            <div className="space-y-1.5 min-h-[60px] max-h-[140px] overflow-y-auto pr-1">
              {sideEffects.bookingRequests.length === 0 ? (
                <div className="text-[11px] text-muted-foreground italic py-3 text-center">
                  No booking requests created in this window.
                </div>
              ) : (
                sideEffects.bookingRequests.map((b) => (
                  <div
                    key={b.id}
                    className="p-2 rounded border border-border/60 bg-background text-[11px] flex flex-col gap-0.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-medium text-foreground">
                      <span>{b.patientName || 'Anonymous Patient'}</span>
                      <span className="uppercase text-[9px] px-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate">{b.reason || 'General booking'}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-0.5">
                      <span>{b.requestedVia}</span>
                      <span>{new Date(b.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Human Escalations / Handoffs */}
          <div className="p-3 rounded-lg border border-border/80 bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                Staff Handoffs
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                {sideEffects.handoffs.length} recent
              </span>
            </div>

            <div className="space-y-1.5 min-h-[60px] max-h-[140px] overflow-y-auto pr-1">
              {sideEffects.handoffs.length === 0 ? (
                <div className="text-[11px] text-muted-foreground italic py-3 text-center">
                  No receptionist handoffs triggered.
                </div>
              ) : (
                sideEffects.handoffs.map((h) => (
                  <div
                    key={h.id}
                    className="p-2 rounded border border-border/60 bg-background text-[11px] flex flex-col gap-0.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-medium text-foreground">
                      <span className="truncate">{h.reason}</span>
                      <span className="uppercase text-[9px] px-1 rounded bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold">
                        {h.urgency}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                      {new Date(h.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="p-3 rounded-lg border border-border/80 bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Audit Logs
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                {sideEffects.auditLogs.length} logged
              </span>
            </div>

            <div className="space-y-1.5 min-h-[60px] max-h-[140px] overflow-y-auto pr-1">
              {sideEffects.auditLogs.length === 0 ? (
                <div className="text-[11px] text-muted-foreground italic py-3 text-center">
                  No recent audit events.
                </div>
              ) : (
                sideEffects.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded border border-border/60 bg-background text-[11px] flex flex-col gap-0.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-medium text-foreground">
                      <span className="font-mono text-primary text-[10px]">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      Entity: <span className="font-medium text-foreground">{log.entity}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* New Session Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Start New Simulator Session
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">Session Label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. WhatsApp Booking Demo #1"
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Simulated Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="voice">AI Voice Telephony</option>
                  <option value="instagram">Instagram Direct</option>
                  <option value="facebook">Facebook Messenger</option>
                  <option value="google">Google Business Messages</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Simulated Patient Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                >
                  Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
