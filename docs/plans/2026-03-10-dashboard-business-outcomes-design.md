# Dashboard Business Outcomes Refresh Design

## Context

The current dashboard homepage still reflects an infrastructure-monitoring mindset. It includes a `平台健康度监控` table and a `平台资源一览` section, but the platform PRD positions DeepexiOS as a business-facing AI operating platform focused on ontology-driven delivery, agent orchestration, and digital worker adoption.

## Problem

The existing lower half of the dashboard does not answer the most important homepage question: whether the platform is producing real business usage and adoption. The health table is operationally legible, but it is low-value in a product demo or executive overview context, and the resource overview duplicates information already implied by the pipeline and headline stats.

## Approved Direction

Replace the health table with a `业务落地成效` board and remove the `平台资源一览` section entirely. Keep `实时活动` on the right side.

## UX Design

The new left-side block should communicate business outcome instead of system status:

- A compact hero summary row with four metrics that represent adoption and value
- A second row of scenario cards showing where digital workers are actually landing
- No dense operational table

The content should feel closer to a business operations command view than a backend console.

## Content Model

The `业务落地成效` board should include:

- `已上线业务场景`
- `近7日智能体会话`
- `自动完成率`
- `人工接管率`

It should also include 3 representative scenario cards such as:

- 设备诊断助手
- 采购协同助手
- 客服工单助手

Each scenario card should show a short value statement, current activity, and a health-like outcome tag expressed as business status instead of infrastructure health.

## Implementation Notes

- Keep the existing top summary cards and right-side timeline
- Remove the dashboard health table completely from the homepage
- Remove the resource overview card completely from the homepage
- Use page-scoped CSS classes in `global.css` to avoid collateral layout changes

## Verification

- Source-based regression test should assert:
  - `业务落地成效` exists
  - `平台健康度监控` does not exist
  - `平台资源一览` does not exist
- Frontend production build must pass
