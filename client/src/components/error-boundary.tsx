import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showReportForm: boolean;
  reportMessage: string;
  isSubmitting: boolean;
  submitted: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      showReportForm: false,
      reportMessage: "",
      isSubmitting: false,
      submitted: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleShowReportForm = () => {
    this.setState({ showReportForm: true });
  };

  handleReportMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ reportMessage: e.target.value });
  };

  handleSubmitReport = async () => {
    this.setState({ isSubmitting: true });
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bug",
          message: `[App Crash Report]\n\n${this.state.reportMessage}\n\nError: ${this.state.error?.message}\n\nStack: ${this.state.error?.stack?.slice(0, 500)}`,
          page: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      });
      if (response.ok) {
        this.setState({ submitted: true, isSubmitting: false });
      } else {
        this.setState({ isSubmitting: false });
      }
    } catch {
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. This has been noted for our team to investigate.
            </p>

            {this.state.submitted ? (
              <div className="p-4 bg-green-50 rounded-lg mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">Thank you for reporting!</p>
                <p className="text-green-600 text-sm">Your feedback helps us improve.</p>
              </div>
            ) : this.state.showReportForm ? (
              <div className="mb-4 text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What were you doing when this happened?
                </label>
                <Textarea
                  value={this.state.reportMessage}
                  onChange={this.handleReportMessageChange}
                  placeholder="I was trying to..."
                  rows={3}
                  className="mb-3"
                  data-testid="input-error-report"
                />
                <Button
                  onClick={this.handleSubmitReport}
                  disabled={this.state.isSubmitting || !this.state.reportMessage.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  data-testid="button-submit-error-report"
                >
                  {this.state.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Report
                    </>
                  )}
                </Button>
              </div>
            ) : null}

            <div className="space-y-3">
              <Button
                onClick={this.handleReload}
                className="w-full"
                data-testid="button-reload"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
                data-testid="button-go-home"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              {!this.state.showReportForm && !this.state.submitted && (
                <Button
                  onClick={this.handleShowReportForm}
                  variant="ghost"
                  className="w-full text-amber-600 hover:text-amber-700"
                  data-testid="button-report-issue"
                >
                  Report This Issue
                </Button>
              )}
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
