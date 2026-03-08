import { FolderOpenOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function TrainingDatasetsPage() {
  return (
    <PlaceholderPage
      icon={<FolderOpenOutlined />}
      title="训练数据集"
      subtitle="Training Datasets — 数据集版本管理与特征工程"
      pipelineLevel="L5 模型训练"
      description="管理模型训练所需的数据集。从本体语义层导出结构化数据，支持 Train/Val/Test 切分、特征工程、数据增强和版本快照。"
      features={[
        { title: '数据集导入', desc: '从本体导出实体/关系数据，自动转换为训练格式', priority: 'P0' },
        { title: '数据切分', desc: '支持 Train/Val/Test 按比例切分，可配置随机种子', priority: 'P0' },
        { title: '特征工程', desc: '列选择、编码转换、归一化、特征组合', priority: 'P1' },
        { title: '版本快照', desc: '每次训练自动创建数据快照，确保可复现', priority: 'P0' },
        { title: '数据预览', desc: '在线预览数据集内容、统计分布和质量指标', priority: 'P1' },
        { title: '数据增强', desc: '文本增强、图像变换、过采样/欠采样策略', priority: 'P2' },
      ]}
    />
  )
}
