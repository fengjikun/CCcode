import { Link } from 'react-router-dom'
import {
  ArrowRightOutlined,
  ApartmentOutlined,
  ApiOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import './DocsProductPage.css'

const architectureLayers = [
  {
    title: '业务知识沉淀为本体',
    summary: '统一对象、关系、规则与动作，让企业知识从文档描述变成 AI 可理解的语义结构。',
    icon: <ApartmentOutlined />,
  },
  {
    title: '专家经验封装为 Skill',
    summary: '把分析方法、SOP、模板与约束封装成可复用能力单元，避免每次从零开始。',
    icon: <ThunderboltOutlined />,
  },
  {
    title: '多 Agent 协同执行',
    summary: '按分析、决策、执行分工，让复杂业务任务具备清晰职责与稳定闭环。',
    icon: <DeploymentUnitOutlined />,
  },
  {
    title: 'AI员工面向岗位交付',
    summary: '让业务部门直接使用“设备运维诊断智能体”“排产调度专员”这样的岗位入口。',
    icon: <RobotOutlined />,
  },
]

const landingPhases = [
  {
    step: '01',
    title: '确定高价值场景',
    text: '优先从知识密集、重复频繁、专家依赖强、容易形成闭环的场景切入。',
  },
  {
    step: '02',
    title: '建立业务语义底座',
    text: '围绕对象、关系、规则、动作，沉淀企业自己的本体和统一业务口径。',
  },
  {
    step: '03',
    title: '封装能力并发布应用',
    text: '把专家经验固化为 Skill 和 Agent，最终交付为业务可直接使用的 AI员工。',
  },
  {
    step: '04',
    title: '反馈回流沉淀模型资产',
    text: '把审核、工单、对话和结果沉淀为训练与评测资产，持续锻造企业自己的模型与智能飞轮。',
  },
]

const valueCards = [
  {
    title: '让业务沉淀为模型资产',
    text: '把分散在文档、系统和专家脑中的经验，沉淀为结构化知识、可复用能力和可持续进化的企业模型资产。',
  },
  {
    title: '让复杂流程实现智能协同',
    text: '从单点问答走向跨角色、跨系统、跨流程任务协作，提升效率并降低对少数专家的依赖。',
  },
  {
    title: '让 AI 从试点走向规模化',
    text: '以统一的数据、语义、能力和应用框架，支撑企业从一个场景逐步扩展到多个部门。',
  },
]

const scenarioCards = [
  {
    domain: '制造业',
    title: '设备运维与异常处置',
    text: '围绕设备、故障现象、根因、检查点、工单和备件，形成从诊断到维修闭环的智能协同。',
  },
  {
    domain: '零售与供应链',
    title: '补货调拨与经营决策',
    text: '围绕商品、门店、库存、需求和补货计划，支撑补货建议、调拨执行和经营复盘。',
  },
  {
    domain: '共享服务',
    title: '法务、风控与运营支持',
    text: '围绕合同、条款、审批、履约义务和风险规则，支持审查、预警、协同与闭环跟踪。',
  },
]

const metrics = [
  { value: '语义化', label: '统一业务语言' },
  { value: '能力化', label: '封装专家经验' },
  { value: '模型化', label: '沉淀核心智能资产' },
  { value: '飞轮化', label: '持续提升智能' },
]

const strategySignals = [
  {
    label: '终局',
    title: '模型资产',
    text: '企业最终的核心智能能力，要沉淀为自己的模型。',
  },
  {
    label: '路径',
    title: '业务锻造',
    text: '模型不是脱离业务训练参数，而是从语义、流程与执行中不断形成。',
  },
  {
    label: '方法',
    title: '平台化沉淀',
    text: '通过本体、Skill、Agent、AI员工和反馈飞轮，把能力持续沉淀下来。',
  },
]

export default function DocsProductPage() {
  return (
    <div className="docs-product-page">
      <header className="docs-topbar">
        <Link className="docs-brand" to="/docs">
          <span className="docs-brand__mark">Dx</span>
          <span className="docs-brand__name">DeepexiOS</span>
        </Link>
        <nav className="docs-topbar__nav">
          <a href="#architecture">产品架构</a>
          <a href="#value">业务价值</a>
          <a href="#landing">落地路径</a>
          <Link to="/login">进入平台</Link>
        </nav>
      </header>

      <main>
        <section className="docs-hero">
          <div className="docs-hero__copy">
            <div className="docs-eyebrow">AI 级企业操作系统</div>
            <h1>从业务中锻造企业自己的模型资产</h1>
            <p>
              DeepexiOS 以本体为知识底座，以 Skill 为能力单元，以 Agent 为执行主体，以 AI员工为业务入口，
              帮助企业从“接入一个大模型”升级为“从真实业务出发，持续沉淀模型资产与智能系统”。
            </p>
            <div className="docs-quote-card">
              <strong>核心主张</strong>
              <p>
                我们相信，企业最终的核心智能资产会沉淀为模型；而模型的形成，不是脱离业务去训练参数，
                而是从业务语义、业务执行和持续反馈中不断锻造出来。
              </p>
            </div>
            <div className="docs-hero__actions">
              <a className="docs-button docs-button--primary" href="#architecture">
                了解整体架构
                <ArrowRightOutlined />
              </a>
              <Link className="docs-button docs-button--ghost" to="/login">
                进入平台
              </Link>
            </div>
            <div className="docs-metric-row">
              {metrics.map((metric) => (
                <div key={metric.label} className="docs-metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="docs-hero__visual">
            <img src="/docs-hero-orbit.svg" alt="DeepexiOS 企业智能体系示意图" />
          </div>
        </section>

        <section className="docs-signal-strip">
          {strategySignals.map((signal) => (
            <article key={signal.label} className="docs-signal-card">
              <span className="docs-signal-card__label">{signal.label}</span>
              <h3>{signal.title}</h3>
              <p>{signal.text}</p>
            </article>
          ))}
        </section>

        <section className="docs-problem-strip">
          <div className="docs-problem-strip__item">
            <span>模型会说，但不真正理解企业业务语义</span>
          </div>
          <div className="docs-problem-strip__item">
            <span>知识分散在文档、系统和专家经验中，难以复用</span>
          </div>
          <div className="docs-problem-strip__item">
            <span>单一 AI 助手难以完成跨角色、跨系统、跨流程任务</span>
          </div>
        </section>

        <section className="docs-section docs-section--story">
          <div className="docs-section__heading">
            <span className="docs-section__kicker">产品理念</span>
            <h2>企业最终的核心智能资产会沉淀为模型，而模型必须从业务语义、业务执行和持续反馈中锻造出来</h2>
          </div>
          <div className="docs-story-grid">
            <article>
              <h3>模型的起点一定是业务</h3>
              <p>企业真正有价值的模型，不是脱离业务训练出来的通用参数，而是从对象、关系、规则、流程和执行反馈中逐步生长出来的。</p>
            </article>
            <article>
              <h3>先把知识结构化，再让模型用起来</h3>
              <p>把散落在文档和专家脑中的经验沉淀成结构化资产，才能让模型真正吸收企业知识，而不是停留在通用能力层面。</p>
            </article>
            <article>
              <h3>先把能力产品化，再做多角色协同</h3>
              <p>通过 Skill、Agent 和 AI员工分层，把单点能力做成岗位型入口，再把高频执行结果持续回流，反向锻造企业模型。</p>
            </article>
          </div>
        </section>

        <section id="architecture" className="docs-section">
          <div className="docs-section__heading">
            <span className="docs-section__kicker">产品架构</span>
            <h2>从业务语义、能力编排到模型沉淀，构建企业自己的智能系统</h2>
          </div>
          <div className="docs-architecture">
            <div className="docs-architecture__visual">
              <img src="/docs-enterprise-stack.svg" alt="本体、Skill、Agent、AI员工的产品架构图" />
            </div>
            <div className="docs-architecture__list">
              {architectureLayers.map((layer) => (
                <article key={layer.title} className="docs-architecture-card">
                  <div className="docs-architecture-card__icon">{layer.icon}</div>
                  <div>
                    <h3>{layer.title}</h3>
                    <p>{layer.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="value" className="docs-section docs-section--value">
          <div className="docs-section__heading">
            <span className="docs-section__kicker">业务价值</span>
            <h2>不是再做一个聊天机器人，而是帮助企业打造自己的模型资产和智能生产系统</h2>
          </div>
          <div className="docs-value-grid">
            {valueCards.map((card) => (
              <article key={card.title} className="docs-value-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="docs-section docs-section--loop">
          <div className="docs-loop">
            <div className="docs-loop__copy">
              <span className="docs-section__kicker">持续进化</span>
              <h2>让每一次业务使用，都成为下一轮模型进化的燃料</h2>
              <p>
                DeepexiOS 不把项目停留在一次性交付，而是通过语料处理、知识修订、评测反馈和模型微调，
                让企业逐步建立自己的模型资产沉淀机制和智能飞轮。
              </p>
              <ul className="docs-checklist">
                <li><SafetyCertificateOutlined /> 审核结果回流，持续修正知识与规则</li>
                <li><ApiOutlined /> 业务日志回流，沉淀真实任务链路</li>
                <li><ExperimentOutlined /> 训练与评测联动，持续锻造企业模型</li>
              </ul>
            </div>
            <div className="docs-loop__visual">
              <img src="/docs-evolution-loop.svg" alt="企业智能飞轮示意图" />
            </div>
          </div>
        </section>

        <section className="docs-section docs-section--scenarios">
          <div className="docs-section__heading">
            <span className="docs-section__kicker">适用场景</span>
            <h2>优先落地在知识密集、流程复杂、专家依赖强的核心业务环节</h2>
          </div>
          <div className="docs-scenario-grid">
            {scenarioCards.map((card) => (
              <article key={card.title} className="docs-scenario-card">
                <span className="docs-scenario-card__domain">{card.domain}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="landing" className="docs-section docs-section--landing">
          <div className="docs-section__heading">
            <span className="docs-section__kicker">企业落地路径</span>
            <h2>从一个高价值场景切入，逐步形成企业级智能底座与模型资产</h2>
          </div>
          <div className="docs-timeline">
            {landingPhases.map((phase) => (
              <article key={phase.step} className="docs-timeline__item">
                <div className="docs-timeline__step">{phase.step}</div>
                <div className="docs-timeline__content">
                  <h3>{phase.title}</h3>
                  <p>{phase.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="docs-closing">
          <div className="docs-closing__panel">
            <span className="docs-section__kicker">结语</span>
            <h2>不是把 AI 接进企业，而是把企业能力持续沉淀为模型资产与可运行的智能系统</h2>
            <p>
              当企业拥有自己的语义底座、能力体系、协同机制和模型沉淀飞轮，AI 才会从一个工具，
              变成长期服务业务增长、运营优化和组织提效的核心智能资产。
            </p>
            <div className="docs-hero__actions">
              <Link className="docs-button docs-button--primary" to="/login">
                进入平台
                <ArrowRightOutlined />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
