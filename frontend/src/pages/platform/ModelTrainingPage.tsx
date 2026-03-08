import { useState } from 'react'
import { Button, Card, Form, Input, Modal, Select, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const yamlConfig = `# training_config.yaml
model_name: purchase-order-classifier
version: v2.1.0
framework: PyTorch

data:
  source: ontology://PurchaseOrder/output
  train_split: 0.7
  test_split: 0.15
  val_split: 0.15

hyperparameters:
  learning_rate: 0.001
  batch_size: 32
  epochs: 50
  optimizer: Adam

resources:
  gpu_type: V100
  memory: 16GB

deployment:
  stage: Production
  endpoint: /api/v1/models/purchase-classifier
  max_throughput: 1000 req/s`

export default function ModelTrainingPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>模型训练</Title>
          <Text type="secondary">训练、评估与注册机器学习模型</Text>
        </div>

        <div style={{ margin: '16px 0' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建训练项目
          </Button>
        </div>

        <Paragraph type="secondary">项目目录结构</Paragraph>
        <div className="dir-tree" style={{ marginBottom: 16 }}>
          <div className="dir-item">training_purchase_classifier/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>data/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>notebooks/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>pipelines/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>experiments/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>models/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>evaluation/</div>
        </div>
      </Card>

      <Card className="section-card" title="训练管道配置示例">
        <pre className="code-block">{yamlConfig}</pre>
      </Card>

      {/* ── Create Training Modal ── */}
      <Modal
        title="新建训练项目"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => { setCreateOpen(false); form.resetFields() }}
        okText="创建"
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g., training_churn_predictor" />
          </Form.Item>
          <Form.Item label="数据源" name="dataSource" rules={[{ required: true }]}>
            <Select placeholder="选择本体对象">
              <Select.Option value="customer">ontology://Customer/output</Select.Option>
              <Select.Option value="order">ontology://PurchaseOrder/output</Select.Option>
              <Select.Option value="equipment">ontology://Equipment/output</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="框架" name="framework" rules={[{ required: true }]}>
            <Select placeholder="选择框架">
              <Select.Option value="pytorch">PyTorch</Select.Option>
              <Select.Option value="tensorflow">TensorFlow</Select.Option>
              <Select.Option value="sklearn">scikit-learn</Select.Option>
              <Select.Option value="transformers">Transformers (HuggingFace)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="GPU 资源" name="gpu" rules={[{ required: true }]}>
            <Select placeholder="选择资源">
              <Select.Option value="v100">V100 - 16GB</Select.Option>
              <Select.Option value="a100">A100 - 40GB</Select.Option>
              <Select.Option value="cpu">CPU Only</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
