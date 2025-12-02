create policy "Users can view own messages" on public.chat_messages for select using ((select auth.uid()) = user_id);

create policy "Users can insert own messages" on public.chat_messages for insert with check ((select auth.uid()) = user_id);

create policy "Users can delete own messages" on public.chat_messages for delete using ((select auth.uid()) = user_id);