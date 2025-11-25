Fundamentals
Rate limits
Every day, many thousands of developers make requests to the X API. To help manage the sheer volume of these requests, limits are placed on the number of requests that can be made. These limits help provide the reliable and scalable API that our developer community relies on.
The maximum number of requests allowed is based on a time interval, typically over a specified period or window of time. The most common interval is fifteen minutes. For example, an endpoint with a limit of 900 requests per 15 minutes allows up to 900 requests in any 15-minute interval.
Rate limits depend on the authentication method. For instance, if using OAuth 1.0a User Context, each set of users’ Access Tokens has its own rate limit per period. Alternatively, if using OAuth 2.0 Bearer Token, your app will have its own separate limit per time period. When these limits are exceeded, an error is returned.
​
Table of contents
X API v2 rate limits
X API Enterprise rate limits
Rate limits and authentication method
HTTP headers and response codes
Recovering from rate limits
Tips to avoid being rate limited
​
X API v2 rate limits
The following table lists the rate limits of each X API paid plan. These limits are also available in the developer portal’s products section.
Endpoint	Pro Limit 	Basic Limit 	Free Limit 
Tweets
DELETE /2/tweets/:id	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
17 requests / 24 hours
PER USER

17 requests / 24 hours
PER APP
DELETE /2/users/:id/likes/:tweet_id	50 requests / 15 mins
PER USER
100 requests / 24 hours
PER USER
1 requests / 15 mins
PER USER
DELETE /2/users/:id/retweets/:tweet_id	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
GET /2/tweets	900 requests / 15 mins
PER USER

450 requests / 15 mins
PER APP
15 requests / 15 mins
PER USER

15 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/tweets/:id	900 requests / 15 mins
PER USER

450 requests / 15 mins
PER APP
15 requests / 15 mins
PER USER

15 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/tweets/:id/liking_users	75 requests / 15 mins
PER USER

75 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/tweets/:id/quote_tweets	75 requests / 15 mins
PER USER

75 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

5 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/tweets/:id/retweeted_by	75 requests / 15 mins
PER USER

75 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

5 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/tweets/counts/all	300 requests / 15 mins
PER APP
GET /2/tweets/counts/recent	300 requests / 15 mins
PER APP
5 requests / 15 mins
PER APP
1 requests / 15 mins
PER APP
GET /2/tweets/search/all	1 requests / second
PER USER

1 requests / second
PER APP
GET /2/tweets/search/recent	300 requests / 15 mins
PER USER

450 requests / 15 mins
PER APP
60 requests / 15 mins
PER USER

60 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/tweets/search/stream	50 requests / 15 mins
PER APP
GET /2/tweets/search/stream/rules	450 requests / 15 mins
PER APP
GET /2/users/:id/liked_tweets	75 requests / 15 mins
PER USER

75 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

5 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/users/:id/mentions	300 requests / 15 mins
PER USER

450 requests / 15 mins
PER APP
10 requests / 15 mins
PER USER

15 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/users/:id/timelines/reverse_chronological	180 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
GET /2/users/:id/tweets	900 requests / 15 mins
PER USER

1500 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

10 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/users/reposts_of_me	75 requests / 15 mins
PER USER
75 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
POST /2/tweets	100 requests / 15 mins
PER USER

10000 requests / 24 hours
PER APP
100 requests / 24 hours
PER USER

1667 requests / 24 hours
PER APP
17 requests / 24 hours
PER USER

17 requests / 24 hours
PER APP
POST /2/tweets/search/stream/rules	100 requests / 15 mins
PER APP
POST /2/users/:id/likes	1000 requests / 24 hours
PER USER
200 requests / 24 hours
PER USER
1 requests / 15 mins
PER USER
POST /2/users/:id/retweets	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
PUT /2/tweets/:tweet_id/hidden	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
Users
DELETE /2/users/:source_user_id/following/:target_user_id	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
DELETE /2/users/:source_user_id/muting/:target_user_id	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
GET /2/users	900 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
100 requests / 24 hours
PER USER

500 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
GET /2/users/:id	900 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
100 requests / 24 hours
PER USER

500 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
GET /2/users/:id/blocking	15 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
GET /2/users/:id/muting	15 requests / 15 mins
PER USER
100 requests / 24 hours
PER USER
1 requests / 24 hours
PER USER
GET /2/users/by	900 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
100 requests / 24 hours
PER USER

500 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
GET /2/users/by/username/:username	900 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
100 requests / 24 hours
PER USER

500 requests / 24 hours
PER APP
3 requests / 15 mins
PER USER

3 requests / 15 mins
PER APP
GET /2/users/me	75 requests / 15 mins
PER USER
250 requests / 24 hours
PER USER
25 requests / 24 hours
PER USER
GET /2/users/search	900 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
POST /2/users/:id/following	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
POST /2/users/:id/muting	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
Spaces
GET /2/spaces	300 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/spaces/:id	300 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/spaces/:id/buyers	300 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/spaces/:id/tweets	300 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/spaces/by/creator_ids	300 requests / 15 mins
PER USER

1 requests / second
PER APP
5 requests / 15 mins
PER USER

25 requests / second
PER APP
1 requests / second
PER USER

1 requests / 15 mins
PER APP
GET /2/spaces/search	300 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
Direct Messages
DELETE /2/dm_events/:id	1500 requests / 24 hours
PER USER

4000 requests / 24 hours
PER APP
200 requests / 15 mins
PER USER

2500 requests / 24 hours
PER APP
GET /2/dm_conversations/:dm_conversation_id/dm_events	15 requests / 15 mins
PER USER
1 requests / 24 hours
PER USER
GET /2/dm_conversations/with/:participant_id/dm_events	15 requests / 15 mins
PER USER
1 requests / 24 hours
PER USER
GET /2/dm_events	15 requests / 15 mins
PER USER
1 requests / 24 hours
PER USER
GET /2/dm_events/:id	15 requests / 15 mins
PER USER
5 requests / 24 hours
PER USER
POST /2/dm_conversations	15 requests / 15 mins
PER USER

1440 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
POST /2/dm_conversations/:dm_conversation_id/messages	15 requests / 15 mins
PER USER

1440 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
POST /2/dm_conversations/with/:participant_id/messages	1440 requests / 24 hours
PER USER

1440 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
Lists
DELETE /2/lists/:id	300 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
DELETE /2/lists/:id/members/:user_id	300 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
DELETE /2/users/:id/followed_lists/:list_id	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
DELETE /2/users/:id/pinned_lists/:list_id	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
GET /2/lists/:id	75 requests / 15 mins
PER USER

75 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

5 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/lists/:id/members	900 requests / 15 mins
PER USER

900 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/lists/:id/tweets	900 requests / 15 mins
PER USER

900 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
GET /2/users/:id/list_memberships	75 requests / 15 mins
PER USER

75 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/users/:id/owned_lists	15 requests / 15 mins
PER USER

15 requests / 15 mins
PER APP
100 requests / 24 hours
PER USER

500 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
GET /2/users/:id/pinned_lists	15 requests / 15 mins
PER USER

15 requests / 15 mins
PER APP
100 requests / 24 hours
PER USER

500 requests / 24 hours
PER APP
1 requests / 24 hours
PER USER

1 requests / 24 hours
PER APP
POST /2/lists	300 requests / 15 mins
PER USER
100 requests / 24 hours
PER USER
1 requests / 24 hours
PER USER
POST /2/lists/:id/members	300 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
POST /2/users/:id/followed_lists	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
POST /2/users/:id/pinned_lists	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
PUT /2/lists/:id	300 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
Bookmarks
DELETE /2/users/:id/bookmarks/:tweet_id	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
GET /2/users/:id/bookmarks	180 requests / 15 mins
PER USER
10 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
GET /2/users/:id/bookmarks/folders	50 requests / 15 mins
PER USER

50 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

5 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/users/:id/bookmarks/folders/:folder_id	50 requests / 15 mins
PER USER

50 requests / 15 mins
PER APP
5 requests / 15 mins
PER USER

5 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
POST /2/users/:id/bookmarks	50 requests / 15 mins
PER USER
5 requests / 15 mins
PER USER
1 requests / 15 mins
PER USER
Compliance
GET /2/compliance/jobs	150 requests / 15 mins
PER APP
5 requests / 15 mins
PER APP
1 requests / 15 mins
PER APP
GET /2/compliance/jobs/:job_id	150 requests / 15 mins
PER APP
5 requests / 15 mins
PER APP
1 requests / 15 mins
PER APP
POST /2/compliance/jobs	150 requests / 15 mins
PER APP
15 requests / 15 mins
PER APP
1 requests / 15 mins
PER APP
Usage
GET /2/usage/tweets	50 requests / 15 mins
PER APP
50 requests / 15 mins
PER APP
1 requests / 15 mins
PER APP
Trends
GET /2/trends/by/woeid/:id	75 requests / 15 mins
PER APP
15 requests / 15 mins
PER APP
GET /2/users/personalized_trends	10 requests / 15 mins
PER USER

200 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

20 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 24 hours
PER APP
Communities
GET /2/communities/:id	300 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
GET /2/communities/search	300 requests / 15 mins
PER USER

300 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

25 requests / 15 mins
PER APP
1 requests / 15 mins
PER USER

1 requests / 15 mins
PER APP
​
Rate limits and authentication method
Rate limits are set at both the developer App and user access token levels:
OAuth 2.0 Bearer Token: App rate limit This method allows you to make a certain number of requests on behalf of your developer App. When using this authentication method, limits are determined by the requests made with a Bearer Token.
Example: With a limit of 450 requests per 15-minute interval, you can make 450 requests on behalf of your App within that interval.
OAuth 1.0a User Context: User rate limit This method allows requests to be made on behalf of a X user identified by the user Access Token. For example, if retrieving private metrics from Posts, authenticate with user Access Tokens for that user, generated using the 3-legged OAuth flow.
Example: With a limit of 900 requests per 15 minutes per user, you can make up to 900 requests per user in that time frame.
…
​
HTTP headers and response codes
Use HTTP headers to understand where your application stands within a given rate limit, based on the most recent request made.
x-rate-limit-limit: rate limit ceiling for the endpoint
x-rate-limit-remaining: remaining requests for the 15-minute window
x-rate-limit-reset: remaining time before the rate limit resets (in UTC epoch seconds)
​
Error Responses
If an application exceeds the rate limit for an endpoint, the API will return a HTTP 429 “Too Many Requests” response with the following error message in the response body:

Copy

Ask AI
{ "errors": [ { "code": 88, "message": "Rate limit exceeded" } ] }
​
Recovering from a rate limit
When these rate limits are exceeded, a 429 ‘Too many requests’ error is returned from the endpoint. As discussed below, when rate limit errors occur, a best practice is to examine HTTP headers that indicate when the limit resets and pause requests until then.
When a “too many requests” or rate-limiting error occurs, the frequency of making requests needs to be slowed down. When a rate limit error is hit, the x-rate-limit-reset: HTTP header can be checked to learn when the rate-limiting will reset

. Another common pattern is based on exponential backoff, where the time between requests starts off small (for example, a few seconds), then doubled before each retry. This is continued until a request is successful, or some reasonable maximum time between requests is reached (for example, a few minutes).

Ideally, the client-side is self-aware of existing rate limits and can pause requests until the currently exceeded window expires. If you exceed a 15-minute limit, then waiting a minute or two before retrying makes sense.

Note that beyond these limits on the number of requests, the Standard Basic level of access provides up to 500,000 Posts per month from the recent search and filtered stream endpoints. If you have exceeded the monthly limit on the number of Posts, then it makes more sense for your app to raise a notification and know its enrollment day of the month and hold off requests until that day.
​
Tips to avoid being rate limited
The tips below are there to help you code defensively and reduce the possibility of being rate limited. Some application features that you may want to provide are simply impossible in light of rate-limiting, especially around the freshness of results. If real-time information is an aim of your application, look into the filtered and sampled stream endpoints.
​
Caching
Store API responses if expecting frequent usage. Instead of calling the API on every page load, cache the response locally.
​
Prioritize active users
If your site keeps track of many X users (for example, fetching their current status or statistics about their X usage), consider only requesting data for users who have recently signed into your site.
​
Adapt to the search results
If your application monitors a high volume of search terms, query less often for searches that have no results than for those that do. By using a back-off you can keep up to date on queries that are popular but not waste cycles requesting queries that very rarely change. Alternatively, consider using the filtered stream endpoint and filter with your search queries.
​
Denylist
If an application abuses the rate limits, it will be denied. Denied apps are unable to get a response from the X API. If you or your application has been denied and you think there has been a mistake, you can use our Platform Support forms to request assistance. Please include the following information:
Explain why you think your application was denied.
If you are no longer being rate limited, describe in detail how you fixed the problem.
Consistency
Post cap