/**
 * Meta/Instagram Graph API Integration
 * Handles OAuth flow and posting to Instagram/Facebook
 */

import { createLogger } from "./logger";
import { storage } from "./storage";

const logger = createLogger("MetaInstagram");

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";
const META_GRAPH_INSTAGRAM_URL = "https://graph.instagram.com/v21.0";

interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface InstagramAccountInfo {
  id: string;
  username: string;
  name?: string;
}

interface PublishResult {
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

/**
 * Generate OAuth URL for Meta/Facebook login
 */
export function getMetaOAuthUrl(redirectUri: string): string {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    throw new Error("META_APP_ID environment variable is required");
  }
  
  const scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement",
    "business_management"
  ].join(",");
  
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state: "meta_oauth" // Can be used for CSRF protection
  });
  
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET environment variables are required");
  }
  
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code: code
  });
  
  const response = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    logger.error("Token exchange failed", error);
    throw new Error(error.error?.message || "Failed to exchange code for token");
  }
  
  return response.json();
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<MetaTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET environment variables are required");
  }
  
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken
  });
  
  const response = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    logger.error("Long-lived token exchange failed", error);
    throw new Error(error.error?.message || "Failed to get long-lived token");
  }
  
  return response.json();
}

/**
 * Get user's Facebook Pages
 */
export async function getFacebookPages(accessToken: string): Promise<any[]> {
  const response = await fetch(
    `${META_GRAPH_URL}/me/accounts?access_token=${accessToken}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to get Facebook pages");
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * Get Instagram Business Account linked to a Facebook Page
 */
export async function getInstagramAccount(pageId: string, pageAccessToken: string): Promise<InstagramAccountInfo | null> {
  const response = await fetch(
    `${META_GRAPH_URL}/${pageId}?fields=instagram_business_account{id,username,name}&access_token=${pageAccessToken}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    logger.error("Failed to get Instagram account", error);
    return null;
  }
  
  const data = await response.json();
  return data.instagram_business_account || null;
}

/**
 * Create a media container for Instagram post (Step 1 of publishing)
 */
async function createMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: accessToken
  });
  
  const response = await fetch(
    `${META_GRAPH_URL}/${instagramAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    logger.error("Failed to create media container", error);
    throw new Error(error.error?.message || "Failed to create media container");
  }
  
  const data = await response.json();
  return data.id;
}

/**
 * Create a carousel container for multiple images
 */
async function createCarouselContainer(
  instagramAccountId: string,
  accessToken: string,
  childContainerIds: string[],
  caption: string
): Promise<string> {
  const params = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childContainerIds.join(","),
    caption: caption,
    access_token: accessToken
  });
  
  const response = await fetch(
    `${META_GRAPH_URL}/${instagramAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create carousel container");
  }
  
  const data = await response.json();
  return data.id;
}

/**
 * Create a child container for carousel item (no caption)
 */
async function createCarouselChildContainer(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: accessToken
  });
  
  const response = await fetch(
    `${META_GRAPH_URL}/${instagramAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create carousel child");
  }
  
  const data = await response.json();
  return data.id;
}

/**
 * Publish the media container (Step 2 of publishing)
 */
async function publishMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  containerId: string
): Promise<string> {
  // Wait for Instagram to process the media
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken
  });
  
  const response = await fetch(
    `${META_GRAPH_URL}/${instagramAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    logger.error("Failed to publish media", error);
    throw new Error(error.error?.message || "Failed to publish media");
  }
  
  const data = await response.json();
  return data.id;
}

/**
 * Get post details including permalink
 */
async function getPostDetails(mediaId: string, accessToken: string): Promise<{ id: string; permalink: string }> {
  const response = await fetch(
    `${META_GRAPH_URL}/${mediaId}?fields=id,permalink&access_token=${accessToken}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to get post details");
  }
  
  return response.json();
}

/**
 * Post to Instagram (main function)
 */
export async function postToInstagram(
  caption: string,
  imageUrls: string[]
): Promise<PublishResult> {
  try {
    // Get active Meta connection
    const connection = await storage.getActiveSocialConnection("meta");
    if (!connection) {
      return { success: false, error: "Instagram not connected. Please connect your account in Settings." };
    }
    
    if (!connection.instagramAccountId) {
      return { success: false, error: "No Instagram Business Account linked. Please reconnect." };
    }
    
    const accessToken = connection.accessToken;
    const instagramAccountId = connection.instagramAccountId;
    
    let containerId: string;
    
    if (imageUrls.length === 0) {
      return { success: false, error: "At least one image URL is required for Instagram posts" };
    } else if (imageUrls.length === 1) {
      // Single image post
      containerId = await createMediaContainer(instagramAccountId, accessToken, imageUrls[0], caption);
    } else {
      // Carousel post (multiple images)
      const childIds: string[] = [];
      for (const url of imageUrls.slice(0, 10)) { // Max 10 items in carousel
        const childId = await createCarouselChildContainer(instagramAccountId, accessToken, url);
        childIds.push(childId);
      }
      containerId = await createCarouselContainer(instagramAccountId, accessToken, childIds, caption);
    }
    
    // Publish the container
    const mediaId = await publishMediaContainer(instagramAccountId, accessToken, containerId);
    
    // Get permalink
    const postDetails = await getPostDetails(mediaId, accessToken);
    
    logger.info("Successfully posted to Instagram", { mediaId, permalink: postDetails.permalink });
    
    return {
      success: true,
      postId: mediaId,
      permalink: postDetails.permalink
    };
  } catch (error: any) {
    logger.error("Failed to post to Instagram", { error: error.message });
    return {
      success: false,
      error: error.message || "Unknown error posting to Instagram"
    };
  }
}

/**
 * Post to Facebook Page
 */
export async function postToFacebook(
  message: string,
  imageUrls?: string[]
): Promise<PublishResult> {
  try {
    const connection = await storage.getActiveSocialConnection("meta");
    if (!connection) {
      return { success: false, error: "Facebook not connected. Please connect your account in Settings." };
    }
    
    if (!connection.platformPageId) {
      return { success: false, error: "No Facebook Page linked. Please reconnect." };
    }
    
    const accessToken = connection.accessToken;
    const pageId = connection.platformPageId;
    
    let endpoint: string;
    let body: URLSearchParams;
    
    if (imageUrls && imageUrls.length > 0) {
      // Photo post
      endpoint = `${META_GRAPH_URL}/${pageId}/photos`;
      body = new URLSearchParams({
        url: imageUrls[0],
        message: message,
        access_token: accessToken
      });
    } else {
      // Text-only post
      endpoint = `${META_GRAPH_URL}/${pageId}/feed`;
      body = new URLSearchParams({
        message: message,
        access_token: accessToken
      });
    }
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to post to Facebook");
    }
    
    const data = await response.json();
    
    logger.info("Successfully posted to Facebook", { postId: data.id || data.post_id });
    
    return {
      success: true,
      postId: data.id || data.post_id,
      permalink: `https://facebook.com/${data.id || data.post_id}`
    };
  } catch (error: any) {
    logger.error("Failed to post to Facebook", { error: error.message });
    return {
      success: false,
      error: error.message || "Unknown error posting to Facebook"
    };
  }
}

/**
 * Check publishing rate limit
 */
export async function checkPublishingLimit(instagramAccountId: string, accessToken: string): Promise<{ used: number; total: number }> {
  const response = await fetch(
    `${META_GRAPH_URL}/${instagramAccountId}/content_publishing_limit?access_token=${accessToken}`
  );
  
  if (!response.ok) {
    return { used: 0, total: 50 };
  }
  
  const data = await response.json();
  const limit = data.data?.[0];
  
  return {
    used: limit?.quota_usage || 0,
    total: limit?.config?.quota_total || 50
  };
}

/**
 * Get connection status
 */
export async function getMetaConnectionStatus(): Promise<{
  connected: boolean;
  accountName?: string;
  instagramUsername?: string;
  expiresAt?: Date;
}> {
  const connection = await storage.getActiveSocialConnection("meta");
  
  if (!connection) {
    return { connected: false };
  }
  
  return {
    connected: true,
    accountName: connection.accountName || undefined,
    instagramUsername: (connection.metadata as any)?.instagramUsername,
    expiresAt: connection.accessTokenExpiresAt || undefined
  };
}
