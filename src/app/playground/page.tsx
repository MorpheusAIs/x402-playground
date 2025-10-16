"use client";

import { useState } from "react";
import { JobForm } from "@/components/job-form";
import { LogViewer } from "@/components/log-viewer";
import { SiteHeader } from "@/components/site-header";

export default function Playground() {
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [currentEventSource, setCurrentEventSource] =
    useState<EventSource | null>(null);
  const [agents, setAgents] = useState<Array<{ agent: string; content: string }>>([]);

  const handleJobSubmit = async (
    job: string,
    enablePayment: boolean,
    actAsScraper: boolean
  ) => {
    // Close any existing connection
    if (currentEventSource) {
      currentEventSource.close();
    }

    setIsJobRunning(true);

    try {
      // Create the request URL with job parameter and headers as query params
      const url = new URL("/api/bot", window.location.origin);
      url.searchParams.set("job", job);

      if (enablePayment) {
        url.searchParams.set("enable-payment", "true");
      }

      if (actAsScraper && job === "scrape") {
        url.searchParams.set("act-as-scraper", "true");
      }

      // Create EventSource for the specific job
      const eventSource = new EventSource(url.toString());
      setCurrentEventSource(eventSource);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "result" || data.type === "error") {
            // Job completed
            setIsJobRunning(false);
            eventSource.close();
            setCurrentEventSource(null);
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("EventSource error:", error);
        setIsJobRunning(false);
        eventSource.close();
        setCurrentEventSource(null);
      };
    } catch (error) {
      console.error("Error submitting job:", error);
      setIsJobRunning(false);
    }
  };

  const handleRunAgents = () => {
    if (currentEventSource) {
      currentEventSource.close();
    }
    setAgents([]);
    setIsJobRunning(true);
    const es = new EventSource("/api/agents");
    setCurrentEventSource(es);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.agent) {
          setAgents((prev) => [...prev, data]);
        }
      } catch {}
    };
    es.onerror = () => {
      setIsJobRunning(false);
      es.close();
      setCurrentEventSource(null);
    };
  };

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col p-4">
        <div className="@container/main flex flex-1 flex-col gap-6 p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Job Playground</h1>
            <p className="text-muted-foreground">
              Test different jobs that use x402 paywalled endpoints and watch
              real-time server logs
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            {/* Left side - Job Form */}
            <div className="border rounded-lg p-6 overflow-auto">
              <JobForm onSubmit={handleJobSubmit} isSubmitting={isJobRunning} />
              <div className="mt-4">
                <button
                  onClick={handleRunAgents}
                  className="px-3 py-2 border rounded text-sm"
                >
                  Run Agents Demo
                </button>
                {agents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {agents.map((a, i) => (
                      <div key={i} className="text-sm p-2 border rounded">
                        <div className="font-medium">{a.agent}</div>
                        <div className="text-muted-foreground">{a.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Log Viewer */}
            <div className="border rounded-lg p-6 overflow-auto">
              <LogViewer isActive={isJobRunning} eventSource={currentEventSource} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
