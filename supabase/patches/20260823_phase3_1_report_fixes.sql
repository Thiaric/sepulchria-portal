begin;

alter table public.reports
  drop constraint if exists reports_source_type_check;

alter table public.reports
  add constraint reports_source_type_check
  check (
    source_type is null
    or source_type in (
      'forum_topic',
      'forum_post',
      'direct_message',
      'room_message',
      'instant_chat_message'
    )
  );

alter table public.report_evidence
  drop constraint if exists report_evidence_source_type_check;

alter table public.report_evidence
  add constraint report_evidence_source_type_check
  check (
    source_type is null
    or source_type in (
      'forum_topic',
      'forum_post',
      'direct_message',
      'room_message',
      'instant_chat_message'
    )
  );

commit;
