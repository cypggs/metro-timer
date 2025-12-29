-- 地铁计时系统数据库 Schema (免登录版本)
-- 在 Supabase SQL Editor 中执行此文件

-- 删除旧的表（如果存在）
DROP TABLE IF EXISTS public.checkpoint_records CASCADE;
DROP TABLE IF EXISTS public.checkpoints CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 行程表 (使用本地生成的匿名ID作为user_id)
CREATE TABLE public.trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,  -- 匿名ID，存储在localStorage中
  name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  total_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 打卡点类型枚举
DO $$ BEGIN
  CREATE TYPE checkpoint_type AS ENUM ('walk_to_station', 'enter_station', 'exit_station', 'destination');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 打卡点表
CREATE TABLE public.checkpoints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  checkpoint_type TEXT NOT NULL CHECK (checkpoint_type IN ('walk_to_station', 'enter_station', 'exit_station', 'destination')),
  sequence_order INTEGER NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 打卡记录表
CREATE TABLE public.checkpoint_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('arrival', 'departure')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_checkpoints_trip_id ON public.checkpoints(trip_id);
CREATE INDEX idx_checkpoint_records_checkpoint_id ON public.checkpoint_records(checkpoint_id);
CREATE INDEX idx_trips_created_at ON public.trips(created_at DESC);

-- 行级安全策略 (RLS) - 匿名访问
-- 由于使用本地存储的匿名ID，无需用户认证即可访问

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_records ENABLE ROW LEVEL SECURITY;

-- Trips 策略：允许匿名访问（基于user_id匹配localStorage中的ID）
CREATE POLICY "允许匿名访问行程" ON public.trips
  FOR ALL USING (true);

-- Checkpoints 策略：允许匿名访问
CREATE POLICY "允许匿名访问打卡点" ON public.checkpoints
  FOR ALL USING (true);

-- Checkpoint Records 策略：允许匿名访问
CREATE POLICY "允许匿名访问打卡记录" ON public.checkpoint_records
  FOR ALL USING (true);

-- 自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为trips表添加 updated_at 触发器
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 授予访问权限
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
