import { ExperimentOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function ModelTrainingPage() {
  return (
    <PlaceholderPage
      icon={<ExperimentOutlined />}
      title="模型训练"
      subtitle="Model Training — 训练、评估与注册"
      pipelineLevel="L5 模型训练"
      description="模型全生命周期管理平台。从 Ontology 导入结构化数据集，支持特征工程、模型训练、实验追踪、评估对比和模型注册发布。"
      features={[
        { title: '数据准备', desc: '从本体导入数据集，支持特征工程、数据切分和版本快照', priority: 'P0' },
        { title: '训练环境', desc: 'Jupyter Notebook、Python 脚本，可配置 GPU/CPU 资源', priority: 'P0' },
        { title: '实验追踪', desc: '自动记录超参数、指标、数据版本和代码版本', priority: 'P0' },
        { title: '模型评估', desc: '多模型对比、指标可视化、偏差检测和公平性审计', priority: 'P0' },
        { title: '模型注册', desc: 'Model Registry：版本、元数据、依赖、状态管理', priority: 'P0' },
        { title: 'LLM 微调', desc: '支持 LoRA/QLoRA 微调、Prompt 模板管理', priority: 'P1' },
      ]}
    />
  )
}
