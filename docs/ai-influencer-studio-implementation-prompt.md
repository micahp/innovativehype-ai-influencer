# AI Influencer Studio — Implementation Prompt

I’d build this as an AI Influencer Studio, not just two social media bots. You want a system that researches successful creators, identifies which content formats work, develops two consistent virtual personalities, creates original content through Fine Photo Gen, and operates their Instagram and X accounts.

The most important distinction is that the system should learn from actual posts and performance data, not just ask an LLM to invent 365 days of content.

Here’s the prompt I’d give your coding agent.

# Build an Autonomous AI Influencer Studio

## Mission

Build a production-ready, self-hosted AI influencer management platform that can research social media trends, analyze successful influencers, create consistent fictional AI personalities, generate original images and videos, plan content for an entire year, publish to Instagram and X (Twitter), and continuously improve its content strategy based on actual performance.

This is an implementation task, not just a research or planning exercise. Build the application, its data pipelines, agent workflows, admin dashboard, tests, and deployment configuration.

The platform must initially support two adult female AI influencers but should be architected to support dozens of distinct virtual creators in the future.

We already have an AI image generation product called Fine Photo Gen. Investigate how to integrate with its existing image generation capabilities rather than rebuilding that functionality.

The influencer studio should run independently on its own server, with Fine Photo Gen treated as an external generation provider.

## 1. The Initial Influencers

Create two independent virtual identities with their own aesthetics, personalities, audiences, and content strategies.

### Influencer A: The Curvy Gamer Girl

#### Identity

* Fictional adult woman, approximately 25–30 years old.
* Thick, BBW/plus-size figure with a voluptuous silhouette, large bust, prominent hips and butt, and consistently recognizable body proportions.
* Attractive, stylish, playful, confident, and genuinely interested in gaming.
* Distinct, recognizable face, hairstyle, wardrobe, and overall visual identity.

#### Content niches

* Gaming culture and commentary
* Popular video games and new releases
* Gaming setups and PC hardware
* Streaming culture
* Gamer fashion and cosplay
* Memes and relatable gamer humor
* Lifestyle and outfit content
* Body confidence and personal style

#### Content types

* Photorealistic gaming setup photos
* Outfit and lifestyle posts
* Gaming memes and reactions
* Game release commentary
* Short-form gaming videos
* Original cosplay concepts
* Personality-driven tweets
* Gaming-related conversations and audience polls

She should feel like a recognizable creator with genuine interests, opinions, and a coherent fictional personality, rather than a generic collection of attractive AI photographs.

Her visual style can be flirty and fashionable while remaining compliant with the destination platform’s content policies.

### Influencer B: The Fitness and Beauty Girl

#### Identity

* Fictional adult woman, approximately 25–30 years old.
* Slim, athletic, fit physique with natural-looking proportions.
* Consistent facial identity, hairstyle, skin texture, and recognizable physical appearance.
* Confident, stylish, aspirational, and approachable.

#### Content niches

* Fitness and workout routines
* Gym fashion
* Makeup and beauty tutorials
* Skincare
* Athletic lifestyle
* Outfit-of-the-day posts
* Wellness and recovery
* Beauty products and trends
* Daily routines

#### Content types

* Gym photos and workout demonstrations
* Makeup looks and beauty transformations
* Fitness outfit photography
* Lifestyle and wellness photography
* Tutorials and short-form videos
* Product-focused editorial content
* Motivational and conversational posts

Do not let her content become interchangeable with the gamer influencer.

### Personality Requirements

Each influencer needs a persistent identity specification containing:

* Name, handle suggestions, and biography
* Personality traits and communication style
* Interests and topic expertise
* Voice and vocabulary
* Humor and conversational patterns
* Recurring content themes
* Visual style guide and wardrobe
* Face and body reference assets
* Audience demographics and positioning
* Brand values
* Topics to avoid
* Content boundaries
* Fictional backstory and continuity rules

Both accounts must transparently identify themselves as AI-generated virtual creators. They must not impersonate real people or fabricate real-world experiences, qualifications, sponsorships, or endorsements.

Store personality specifications as versioned data, not hard-coded system prompts.

---

## 2. Social Media Research and Competitive Intelligence

This is one of the most important components of the platform.

Build a research engine that discovers successful influencers, analyzes specific posts, identifies patterns associated with performance, and translates those findings into original content strategies.

Do not simply ask an LLM what is trending.

### Influencer Discovery

Research the following categories:

For Influencer A:

* Female gaming influencers
* Plus-size fashion creators
* Cosplay creators
* Gaming meme accounts
* Gaming lifestyle influencers
* High-engagement female gaming personalities

For Influencer B:

* Fitness influencers
* Gym and athleisure creators
* Makeup creators
* Beauty tutorial accounts
* Skincare creators
* Fashion and lifestyle creators

Start by identifying approximately 20–40 relevant reference accounts per niche, subject to available and permitted data access.

Store:

* Platform
* Username and profile URL
* Niche and audience positioning
* Available follower information
* Content types
* Posting frequency
* Relevant hashtags and topics
* Public engagement information, when available
* Reason the account is relevant
* Data provenance and collection timestamp

### Post-Level Research

Go beyond influencer profiles.

Identify and catalog individual posts worth studying.

For each reference post, collect, where legally and technically permitted:

* Original post URL and ID
* Creator and platform
* Publication date
* Content format
* Caption and hashtags
* Available engagement metrics
* Available views or impressions
* Engagement rate, when calculable
* Image/video description
* Subject matter
* Visual composition
* Outfit and styling characteristics
* Lighting and camera framing
* Hook or opening line
* Call to action
* Emotional appeal
* Possible reasons the post performed well

Record missing metrics as missing. Never invent views, engagement, follower counts, or performance rankings.

Support manual submission of individual reference URLs and creator profiles through the dashboard, alongside authorized API and licensed-data integrations.

### Visual Content Analysis

Use multimodal models where appropriate to analyze reference images and videos.

Extract reusable creative concepts such as:

* Camera angle
* Composition
* Shot type
* Lighting
* Color palette
* Fashion aesthetic
* Background and setting
* Facial expression
* Energy and mood
* Caption structure
* Narrative format

Build a searchable inspiration library with tags, filters, similarity search, and source links.

The system should emulate effective content structures, styles, and creative principles while generating genuinely original work. Never clone the likeness of a real influencer, reproduce their exact photography, or reuse copyrighted assets without permission.

### Performance-Based Ranking

Build a configurable ranking system for reference posts.

Consider:

* Engagement relative to audience size
* Views relative to available benchmarks
* Recency
* Relevance to our target audience
* Repeatability of the content concept
* Production cost
* Alignment with influencer identity
* Strength and completeness of performance evidence

Do not treat raw likes as the only indicator of success.

Track uncertainty and distinguish observed performance from speculative explanations of why a post succeeded.

---

## 3. Trend Research Engine

Create scheduled research jobs that identify relevant content opportunities.

### Sources

Investigate compliant data access for:

* Instagram
* X
* Google Trends
* YouTube
* Reddit
* Gaming news and release calendars
* Beauty and fashion publications
* Fitness and wellness publications
* Seasonal events and holidays
* Publicly available entertainment calendars

Use official APIs, authorized feeds, permitted public sources, and licensed providers.

Do not build the system around unauthorized scraping, browser automation that violates platform rules, or bypassing access restrictions.

### Daily Trend Research

Identify:

* Emerging gaming topics
* New game announcements and launches
* Viral gaming memes
* Popular makeup styles
* Seasonal beauty interests
* Fitness and workout trends
* Relevant cultural moments
* New content formats gaining traction

For every trend, record:

1. Source and timestamp
2. Evidence of relevance
3. Target audience
4. Appropriate influencer
5. Proposed original content concept
6. Estimated production effort
7. Recommended publication window
8. Confidence level

The system must distinguish between time-sensitive trends and evergreen content.

Do not automatically hijack unrelated trending conversations or post repetitive trend-based content.

---

## 4. Full-Year Content Strategy

Build a 12-month editorial planning engine.

I want a complete annual content strategy for each influencer, with the ability to replan based on actual results.

### Planning Levels

#### Annual strategy

* Brand positioning
* Audience growth objectives
* Major content pillars
* Seasonal opportunities
* Campaign themes
* Content format mix
* Monetization opportunities
* Experiments and growth milestones

#### Quarterly planning

* Quarterly objectives
* Theme calendars
* Major campaigns
* Priority experiments
* Expected content production volume

#### Monthly calendar

* Weekly themes
* Planned post concepts
* Platform-specific tactics
* Relevant holidays and events
* Planned collaborations, where authentic and authorized

#### Weekly calendar

* Specific posts
* Captions
* Creative briefs
* Image/video generation instructions
* Publishing dates
* Research references
* Approval state

Generate the initial 12-month roadmap, a detailed first 30 days, and a production-ready first 14 days for both influencers.

Use a rolling planning model:

* Refresh trend signals daily.
* Review performance weekly.
* Reprioritize content monthly.
* Reevaluate overall strategy quarterly.

Preserve completed and historical plans for auditing.

### Content Mix

Support a configurable mix of:

* Evergreen posts
* Trend-responsive posts
* Lifestyle content
* Educational content
* Entertainment
* Audience interaction
* Brand-building content
* Promotional content

Avoid generating hundreds of nearly identical images with slightly different captions.

The goal is recognizable personalities, coherent storytelling, and original content with genuine audience value.

---

## 5. Fine Photo Gen Integration

Fine Photo Gen should be the primary image generation backend.

Inspect the actual Fine Photo Gen repository, API capabilities, authentication, storage, and deployment architecture before implementing the integration.

Do not assume undocumented endpoints exist.

### Required Features

Build a generation-provider abstraction supporting:

* Text-to-image generation
* Image-to-image editing
* Character-specific LoRA models, when supported
* Reference-based image generation
* Background editing
* Aspect ratio and resolution selection
* Batch generation
* Generation status tracking
* Provider/model selection
* Cost tracking
* Asset storage and retrieval

Design optional video generation integrations behind the same provider interface.

If Fine Photo Gen lacks a required API capability, either implement a minimally scoped compatible endpoint or provide a documented adapter and explicit integration requirements.

### Persistent Character Consistency

Every influencer must have a character identity pack.

Include:

* Canonical face references
* Body proportion references
* Hairstyle and color specifications
* Typical outfits
* Distinctive facial characteristics
* Approved style variations
* Identity embeddings, when supported
* Generation model and LoRA version
* Negative prompts and drift controls

A generated photo should look like the same character appearing in a new setting, not a different woman every time.

Add automated visual QA for:

* Facial consistency
* Body consistency
* Anatomical problems
* Hand/finger artifacts
* Background errors
* Clothing errors
* Inconsistent identity
* Image quality
* Platform-specific content safety

Use automated checks to flag questionable outputs for manual approval.

### Generation Workflow

Research insight → Content brief → Prompt generation → Fine Photo Gen → Candidate images → Quality evaluation → Approval → Caption generation → Scheduled post.

Allow multiple candidate images per concept and regenerate individual candidates without losing provenance.

Track each generation’s:

* Prompt
* Negative prompt
* Seed
* Provider
* Model/version
* Character version
* Reference assets
* Generation cost
* Output URL
* Approval decision

Keep the generation system separate from the publishing system.

---

## 6. Content Creation Agents

Build an orchestrated multi-agent workflow with clear responsibilities.

### Research Agent

Finds influencers, posts, trends, and useful reference material.

### Strategy Agent

Creates and revises annual, quarterly, monthly, and weekly content strategies.

### Creative Director Agent

Turns research insights into original, character-specific creative briefs, photography concepts, and shot lists.

### Image Production Agent

Calls Fine Photo Gen, generates candidate outputs, and manages revisions.

### Copywriting Agent

Writes Instagram captions, X posts, hooks, hashtags, and post variations.

It must respect each character’s personality and avoid repetitive generic AI writing.

### Quality Control Agent

Checks visual consistency, content originality, factual claims, formatting, policy compliance, and brand alignment.

### Publishing Agent

Schedules and publishes approved content using supported official platform integrations.

### Analytics Agent

Collects performance data, analyzes experiments, and recommends changes.

### Orchestrator

Coordinates job dependencies, retries, queues, approval requirements, and agent failures.

Each agent should have versioned prompts, defined inputs and outputs, structured logs, and clear cost accounting.

Avoid creating an unnecessarily complex collection of autonomous agents if simpler deterministic workflows are more reliable.

---

## 7. Instagram and X Publishing

Support both platforms with independent publishing adapters.

### Instagram

Investigate current Meta publishing APIs and access requirements.

Support where permitted:

* Image feed posts
* Carousels
* Reels/video
* Captions
* Hashtags
* Scheduled publishing
* Post status synchronization
* Account analytics

Use appropriate professional account permissions and authentication.

### X (Twitter)

Use the official X API and the capabilities available under the configured access tier.

Support:

* Text posts
* Image posts
* Video posts, if available
* Threads
* Scheduled publishing
* Post status tracking
* Accessible performance metrics

### Publishing Rules

* No duplicate or substantially identical spam across accounts.
* No automated mass following, liking, or unsolicited replies.
* No unauthorized browser-based posting workarounds.
* Respect API limits and token permissions.
* Support AI-content disclosures and commercial sponsorship labels.
* Never claim to have performed real-world events that did not happen.

Build configurable operation modes:

1. Draft only
2. Human approval required
3. Automatic publishing of preapproved content
4. Conditional autopublishing for validated, low-risk content categories

Default to human approval during initial testing.

Include an emergency pause switch that stops scheduled publishing for any or all accounts.

If platform credentials or permissions are unavailable, complete the integration with mocks and a working manual publishing/export fallback, explicitly indicating the missing live activation steps.

---

## 8. Analytics and Continuous Optimization

The platform must learn from the performance of its own published content.

Collect available metrics such as:

* Impressions and reach
* Views
* Likes
* Comments
* Shares
* Saves
* Profile visits
* Followers gained
* Link clicks
* Engagement rates
* Video watch metrics where available

Track missing and unavailable metrics explicitly.

### Performance Analysis

Evaluate results by:

* Influencer
* Platform
* Content pillar
* Content format
* Topic
* Visual style
* Caption format
* Hook
* Posting time
* Campaign
* Generation model
* Production cost

Build a weekly performance report.

Examples of questions the system should answer:

* Which types of gamer content attract the most engagement?
* Do gaming setup photos outperform outfit photos?
* Which fitness content themes generate repeat engagement?
* Are makeup tutorials performing better than gym lifestyle content?
* Which image styles appear to perform best?
* Are carousels or single images producing stronger results?
* Which posts gained the most followers per impression?
* Which content types provide the best results relative to generation cost?

Compare content using appropriate exposure-adjusted metrics and confidence estimates where possible.

Avoid concluding that a creative element caused strong performance without sufficient evidence.

### Experimentation Engine

Support experiments involving:

* Caption hooks
* Image compositions
* Content topics
* Post formats
* Publishing schedules
* Creative treatments
* Calls to action

Log hypotheses before testing.

Use the results to update future content recommendations while preserving experiment history.

The system should improve its strategy through measured evidence, not uncontrolled prompt rewrites.

---

## 9. Admin Dashboard

Create a responsive web dashboard for managing all influencers from one location.

### Dashboard Sections

#### Overview

* Influencer accounts
* Latest posts
* Planned posts
* Pending approvals
* Growth metrics
* API status
* Generation costs
* Job failures

#### Influencer Manager

* Identity profiles
* Reference images
* Personality configuration
* Character version history
* Social account configuration

#### Research Library

* Reference influencers
* Individual posts
* Search and filtering
* Engagement benchmarks
* Visual inspiration boards
* Saved research collections
* User-submitted URLs

#### Content Calendar

* Year view
* Month view
* Week view
* Scheduled posts
* Content themes
* Drag-and-drop rescheduling

#### Content Studio

* Creative briefs
* Generated images and videos
* Prompt editor
* Caption editor
* Regeneration controls
* Approval/rejection workflows

#### Publishing

* Scheduled posts
* Posted content
* Failed posts
* Platform-specific previews
* Publishing logs

#### Analytics

* Per-influencer performance
* Platform comparison
* Content category performance
* Growth charts
* Experiments
* Cost per content asset
* Weekly strategy reports

#### System Administration

* Agent executions
* Worker health
* Data sources
* API connections
* Budgets and usage
* Logs
* Error monitoring
* Automation settings

I should be able to review the entire operation without opening a terminal.

---

## 10. Technical Architecture

Build the influencer studio as its own deployable application.

Preferred stack, subject to inspecting the existing environment:

* Next.js and TypeScript for the frontend
* Tailwind CSS and shadcn/ui for the interface
* Node.js/TypeScript for backend services
* PostgreSQL and Prisma for structured data
* Redis and a durable job queue for asynchronous workflows
* Docker Compose for self-hosted deployment
* S3-compatible object storage for assets
* Fine Photo Gen as an external generation service
* Pluggable LLM and research providers

Avoid coupling the studio directly to Fine Photo Gen’s database.

Use authenticated service-to-service APIs and a separately deployable worker system.

### Core Data Models

Design schemas for:

* Influencers
* Personas and persona versions
* Character reference assets
* Social accounts
* Research sources
* Reference influencers
* Reference posts
* Trend signals
* Inspiration collections
* Annual strategies
* Campaigns
* Content calendars
* Content briefs
* Generated media assets
* Generation jobs
* Captions
* Scheduled posts
* Published posts
* Post metrics
* Experiments
* Agent runs
* Provider usage and costs
* Approval records
* Audit logs

Preserve traceability from every published post back to the research insight, creative brief, prompt, and generated asset that produced it.

### Infrastructure Requirements

Include:

* Environment variable templates
* Authentication and secret management
* OAuth integrations where appropriate
* Job retries with backoff
* Idempotent publishing to prevent accidental duplicate posts
* Queue monitoring
* Structured logging
* Database migrations
* Automated backups
* Asset lifecycle policies
* Model/provider fallbacks
* Configurable spending limits
* Error notifications
* Deployment and recovery documentation

Support sandbox and production environments.

No platform credentials should be committed to source control.

---

## 11. Cost Management

The operation should be economical to run.

Build a budget system that tracks:

* Research/API costs
* LLM token usage
* Image generation
* Video generation
* Storage
* Social platform API expenses
* Estimated cost per published post

Cache repeatable research results and batch generation requests where appropriate.

Enforce configurable daily and monthly budgets per influencer and provider.

When a budget is exhausted, pause expensive work without corrupting jobs or publishing incomplete content.

Show projected monthly costs and actual costs in the dashboard.

Do not optimize exclusively for the cheapest model. Evaluate output quality, reliability, and cost together.

---

## 12. Monetization Readiness

Design for eventual revenue without making monetization a requirement for initial launch.

Possible revenue channels:

* Authorized brand partnerships
* Sponsored posts
* Affiliate links
* Fashion and beauty partnerships
* Gaming products and accessories
* Fitness apparel and equipment
* Original digital products

Support:

* Campaign tracking
* Affiliate link management
* Link attribution
* Sponsored-post disclosures
* Campaign performance reporting

Do not fabricate product usage, results, or paid partnerships.

---

## 13. Implementation Phases

### Phase 1: Repository and Feasibility Audit

Inspect the environment and Fine Photo Gen capabilities.

Deliver:

* Existing capabilities inventory
* Instagram and X API feasibility
* Data acquisition feasibility
* Recommended architecture
* Known blockers
* Implementation roadmap

Proceed with the actual build rather than stopping after writing the roadmap.

### Phase 2: Research and Content Intelligence MVP

Implement:

* Reference account discovery
* Individual post ingestion
* Manual URL submission
* Content analysis
* Searchable inspiration library
* Performance data normalization
* Research dashboard

Use real, verifiable research data wherever accessible.

### Phase 3: Influencer Identity and Media Production

Implement:

* Two complete persona configurations
* Character reference packs
* Fine Photo Gen provider adapter
* Image generation
* Character consistency QA
* Media asset library

### Phase 4: Planning and Production

Implement:

* 12-month editorial strategy per influencer
* Detailed first 30-day calendar
* First 14 days of production briefs
* Automated caption generation
* Content approval workflow
* Generation job orchestration

### Phase 5: Publishing

Implement:

* Instagram publishing adapter
* X publishing adapter
* Scheduler
* Platform-specific previews
* Publication state tracking
* Error handling
* Manual export fallback

### Phase 6: Analytics and Optimization

Implement:

* Performance ingestion
* Analytics dashboard
* Weekly reporting
* Experiment tracking
* Automatic strategy recommendations
* Calendar updates based on evidence

---

## 14. Testing and Acceptance Criteria

Use test-driven development for critical workflows.

The application is not complete until the following can be demonstrated:

1. Two separate, persistent fictional influencer identities exist.
2. Each influencer has distinct positioning, content themes, personality, and visual references.
3. Research records include actual source URLs and provenance.
4. At least 50 relevant reference post records per influencer are collected where accessible, with coverage limitations explicitly reported.
5. Reference posts can be analyzed and compared without fabricated engagement metrics.
6. Both influencers have 12-month strategies and detailed 30-day content calendars.
7. The system can turn research findings into original creative briefs.
8. Fine Photo Gen can be called through a documented provider integration or verified test adapter.
9. Candidate images maintain character identity to the extent supported by the chosen models, with drift detected and surfaced.
10. Captions differ meaningfully by persona and platform.
11. Generated assets, prompts, and costs are persisted.
12. Posts can move through draft, review, approved, scheduled, and published states.
13. Publishing works in dry-run mode with mocked platform APIs.
14. Live publishing can be activated after supplying valid credentials and permissions.
15. Repeated worker executions cannot accidentally publish duplicate posts.
16. Historical post metrics can be ingested and displayed.
17. Weekly analytics can produce recommendations tied to actual observations.
18. The scheduler can run independently of the dashboard.
19. Job failures, API failures, and exhausted budgets are handled safely.
20. The entire system can deploy independently of Fine Photo Gen.

Include unit tests, integration tests, API contract tests, and end-to-end tests for the critical workflows.

Do not mark blocked external integrations as successfully tested in production.

---

## 15. Required Initial Deliverables

At the end of implementation, provide:

1. The working application and its repository changes.
2. The dashboard.
3. The two fully defined influencer profiles.
4. The research library with verifiable examples.
5. The initial annual strategies.
6. The first month of scheduled content concepts.
7. The first week’s generated content candidates.
8. The Fine Photo Gen integration.
9. Publishing adapters and activation instructions.
10. Analytics and workflow monitoring.
11. Tests and test results.
12. Deployment instructions.
13. A clear breakdown of what is live, what is in sandbox mode, and what remains blocked by external access or credentials.

## Final Instructions

Think of this as building the operating system for a small AI-native influencer agency.

The product should be capable of supporting many distinct virtual creators, learning from existing market data, producing consistent original creative assets, managing content calendars, and measuring results.

Prioritize working software, persistent state, reproducibility, actual data, and clear metrics over elaborate agent demonstrations.

Avoid premature infrastructure complexity.

Do not fabricate research, success metrics, platform capabilities, or generated content results.

Start with the repository and API audit, establish the architecture, and then implement the smallest complete end-to-end workflow:

Discover → Research → Plan → Generate → Review → Schedule → Publish → Measure → Improve.

Once that workflow works for one influencer, generalize it to the second and then to additional accounts.

Keep a running implementation log, document blockers, and provide a final acceptance report showing which requirements have passed.

Begin implementation now.

## Two decisions I’d make up front

First, make research the product’s competitive advantage. You already have Fine Photo Gen for media generation. The more valuable component is building a growing database of successful posts, formats, styles, and performance patterns, connected directly to the content you produce. That gives you something more useful than a generic AI posting scheduler.

Second, build one shared studio with separate character models. That way, when you want a third influencer, maybe a travel creator or a sports personality, you can add a persona and content strategy without building another system.

One implementation detail matters: Meta’s Instagram API supports professional-account publishing and insights with the appropriate setup, but doesn’t provide unrestricted access to every consumer account. X also restricts automated activity, including duplicate posting and website-scripting workarounds. The research pipeline should therefore support both authorized data sources and manually curated reference posts. Postman API Network +1

The first milestone I would demand from the agent: one real reference post goes into the research library, gets analyzed, becomes an original content brief, produces a consistent image through Fine Photo Gen, and lands in the approval calendar. Once that works, the annual content engine has a foundation worth scaling.
