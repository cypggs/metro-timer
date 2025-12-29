-- 地铁计时系统数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表 (使用 Supabase Auth)
-- profiles 表同步 auth.users

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 行程表
CREATE TABLE public.trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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

-- 行级安全策略 (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_records ENABLE ROW LEVEL SECURITY;

-- Profiles 策略：用户只能查看和修改自己的资料
CREATE POLICY "用户可以查看自己的资料" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的资料" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trips 策略：用户只能操作自己的行程
CREATE POLICY "用户可以查看自己的行程" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的行程" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的行程" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入行程" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Checkpoints 策略
CREATE POLICY "用户可以查看自己行程的打卡点" ON public.checkpoints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = checkpoints.trip_id AND user_id = auth.uid())
  );

CREATE POLICY "用户可以操作自己行程的打卡点" ON public.checkpoints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = checkpoints.trip_id AND user_id = auth.uid())
  );

-- Checkpoint Records 策略
CREATE POLICY "用户可以查看自己的打卡记录" ON public.checkpoint_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checkpoints c
      JOIN public.trips t ON c.trip_id = t.id
      WHERE c.id = checkpoint_records.checkpoint_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以操作自己的打卡记录" ON public.checkpoint_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.checkpoints c
      JOIN public.trips t ON c.trip_id = t.id
      WHERE c.id = checkpoint_records.checkpoint_id AND t.user_id = auth.uid()
    )
  );

-- 自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为各表添加 updated_at 触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：自动创建用户资料
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 视图：行程完整信息（包含所有打卡点和记录）
CREATE OR REPLACE VIEW public.trip_details AS
SELECT
  t.id as trip_id,
  t.name as trip_name,
  t.start_time,
  t.end_time,
  t.status,
  t.total_duration_seconds,
  t.user_id,
  json_agg(
    json_build_object(
      'checkpoint_id', c.id,
      'checkpoint_name', c.name,
      'checkpoint_type', c.checkpoint_type,
      'sequence_order', c.sequence_order,
      'records', (
        SELECT json_agg(
          json_build_object(
            'record_id', cr.id,
            'action_type', cr.action_type,
            'timestamp', cr.timestamp
          ) ORDER BY cr.timestamp
        )
        FROM public.checkpoint_records cr
        WHERE cr.checkpoint_id = c.id
      )
    ) ORDER BY c.sequence_order
  ) as checkpoints
FROM public.trips t
LEFT JOIN public.checkpoints c ON c.trip_id = t.id
GROUP BY t.id;

-- 授予访问权限
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
