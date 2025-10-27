CREATE TABLE IF NOT EXISTS distillation_data (
  id BIGSERIAL PRIMARY KEY,
  sub_task_id BIGINT NOT NULL REFERENCES sub_tasks(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  inference_process TEXT,
  model_output TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sub_task_id)
);

CREATE INDEX IF NOT EXISTS idx_distillation_data_sub_task_id ON distillation_data(sub_task_id);
