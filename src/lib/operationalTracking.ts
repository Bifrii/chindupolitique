import { supabase } from "@/integrations/supabase/client";

type EventCategory = 'technical' | 'growth' | 'feedback';

interface TrackEventParams {
  category: EventCategory;
  type: string;
  metadata?: Record<string, unknown>;
  pageOrModule?: string;
}

export async function trackEvent({ category, type, metadata = {}, pageOrModule }: TrackEventParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    await (supabase as any).from('operational_events').insert({
      user_id: userId,
      event_category: category,
      event_type: type,
      metadata,
      page_or_module: pageOrModule ?? window.location.pathname,
    });
  } catch (e) {
    // Silent fail — tracking should never break the app
    console.warn('[ops-tracking]', e);
  }
}

// Technical events
export const trackLoginFailed = (reason?: string) =>
  trackEvent({ category: 'technical', type: 'login_failed', metadata: { reason } });

export const trackSignupFailed = (reason?: string) =>
  trackEvent({ category: 'technical', type: 'signup_failed', metadata: { reason } });

export const trackPageError = (error: string, page?: string) =>
  trackEvent({ category: 'technical', type: 'page_error', metadata: { error }, pageOrModule: page });

export const trackApiError = (endpoint: string, status?: number) =>
  trackEvent({ category: 'technical', type: 'api_error', metadata: { endpoint, status } });

export const trackSlowResponse = (endpoint: string, durationMs: number) =>
  trackEvent({ category: 'technical', type: 'slow_response', metadata: { endpoint, durationMs } });

// Growth events
export const trackVisit = () =>
  trackEvent({ category: 'growth', type: 'visit_tracked' });

export const trackSignupSuccess = () =>
  trackEvent({ category: 'growth', type: 'signup_success' });

export const trackOnboardingStarted = () =>
  trackEvent({ category: 'growth', type: 'onboarding_started' });

export const trackOnboardingCompleted = () =>
  trackEvent({ category: 'growth', type: 'onboarding_completed' });

export const trackFeatureUsed = (feature: string) =>
  trackEvent({ category: 'growth', type: 'feature_used', metadata: { feature } });

export const trackCtaClicked = (cta: string) =>
  trackEvent({ category: 'growth', type: 'cta_clicked', metadata: { cta } });

// Feedback events
export const trackFeedbackSubmitted = (message: string) =>
  trackEvent({ category: 'feedback', type: 'feedback_submitted', metadata: { message } });

export const trackBugReported = (description: string) =>
  trackEvent({ category: 'feedback', type: 'bug_reported', metadata: { description } });
