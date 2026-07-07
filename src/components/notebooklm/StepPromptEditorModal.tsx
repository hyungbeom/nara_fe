"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input, Modal } from "antd";
import type { NotebookLMStep } from "@/types/notebooklm";

type StepPromptEditorModalProps = {
  open: boolean;
  mode: "add" | "edit";
  step: NotebookLMStep | null;
  onCancel: () => void;
  onSave: (step: NotebookLMStep) => Promise<void> | void;
};

export default function StepPromptEditorModal({ open, mode, step, onCancel, onSave }: StepPromptEditorModalProps) {
  const [form] = Form.useForm<NotebookLMStep>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    form.setFieldsValue(
      step ?? {
        id: "",
        label: "",
        prompt: "",
      }
    );
  }, [form, open, step]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setIsSaving(true);
    try {
      await onSave({
        id: values.id.trim().toUpperCase(),
        label: values.label.trim(),
        prompt: values.prompt.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "add" ? "프롬프트 단계 추가" : "프롬프트 수정"}
      open={open}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      okText="저장"
      cancelText="취소"
      confirmLoading={isSaving}
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="id"
          label="단계 ID"
          rules={[{ required: true, message: "단계 ID를 입력해 주세요." }]}
        >
          <Input placeholder="예: STEP3" disabled={mode === "edit"} />
        </Form.Item>
        <Form.Item
          name="label"
          label="버튼 이름"
          rules={[{ required: true, message: "버튼 이름을 입력해 주세요." }]}
        >
          <Input placeholder="예: STEP3" />
        </Form.Item>
        <Form.Item
          name="prompt"
          label="프롬프트"
          extra="프로젝트명이 필요하면 {projectName}을 사용하세요."
          rules={[{ required: true, message: "프롬프트를 입력해 주세요." }]}
        >
          <Input.TextArea rows={10} placeholder="마크다운 생성 프롬프트를 입력하세요." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
