# 操作地图

由正式清单生成，执行前发现当前安装版Schema。

| 动作 | 用途 | 必填参数 | 效果 |
| --- | --- | --- | --- |
| list_projects | 查找筹备工程 |  | read |
| get_project | 读取固定筹备工程 | object_id | read |
| save_project | 保存完整筹备工程 | expected_revision, expected_sha256, operation_key, content | managed_write |
| get_source | 分块读取固定来源 | object_id, source_index | read |
| get_basis | 读取固定专业依据 | object_id, basis_index | read |
| compare_versions | 比较固定筹备修订 | object_id, from_revision, to_revision | read |
| export_project | 分块导出完整筹备数据 | object_id, format | read |
| build_context | 准备有界创作上下文 | object_id, goal, max_chars | read |
| create_handoff | 准备本工程AI接续 | object_id, goal | read |
| get_operation | 回读原操作 | operation_key | read |
| put_section | 维护段落 | object_id, expected_revision, expected_sha256, operation_key, section | managed_write |
| remove_section | 移除段落 | object_id, expected_revision, expected_sha256, operation_key, section_id | managed_write |
| put_line | 维护歌词句 | object_id, expected_revision, expected_sha256, operation_key, line | managed_write |
| remove_line | 移除歌词句 | object_id, expected_revision, expected_sha256, operation_key, line_id | managed_write |
| put_occurrence | 维护段落出场 | object_id, expected_revision, expected_sha256, operation_key, occurrence | managed_write |
| remove_occurrence | 移除段落出场 | object_id, expected_revision, expected_sha256, operation_key, occurrence_id | managed_write |
| put_variant | 维护逐句备选 | object_id, expected_revision, expected_sha256, operation_key, variant | managed_write |
| remove_variant | 移除逐句备选 | object_id, expected_revision, expected_sha256, operation_key, variant_id | managed_write |
| put_take | 维护实际录音 | object_id, expected_revision, expected_sha256, operation_key, take | managed_write |
| remove_take | 移除实际录音 | object_id, expected_revision, expected_sha256, operation_key, take_id | managed_write |
| put_mark | 维护逐句时间 | object_id, expected_revision, expected_sha256, operation_key, mark | managed_write |
| remove_mark | 移除逐句时间 | object_id, expected_revision, expected_sha256, operation_key, mark_id | managed_write |
| put_note | 维护固定意见 | object_id, expected_revision, expected_sha256, operation_key, note | managed_write |
| remove_note | 移除固定意见 | object_id, expected_revision, expected_sha256, operation_key, note_id | managed_write |
| check_lyrics | 检查歌词工程 | object_id | read |
| rhyme_report | 核对明确韵尾与长度 | object_id | read |
| song_sheet | 读取实际演唱编排 | object_id | read |
| lyric_digest | 读取当前歌词摘要 | object_id | read |
| line_digest | 读取固定歌词句摘要 | object_id, line_id | read |
| take_digest | 读取录音与对齐摘要 | object_id, take_id | read |
| apply_variant | 使用固定逐句备选 | object_id, expected_revision, expected_sha256, operation_key, variant_id | managed_write |
| preview_lyrics | 预览固定标记歌词 | object_id, source_index | read |
| import_lyrics | 导入固定标记歌词 | object_id, expected_revision, expected_sha256, operation_key, source_index, id_prefix | managed_write |
| preview_lrc | 预览LRC与转换边界 | content | read |
| import_lrc | 按实际录音导入LRC映射 | object_id, expected_revision, expected_sha256, operation_key, content, take_id, import_id | managed_write |
| inspect_take | 核验实际录音与波形 | object_id, take_id | read |
| read_take | 分块读取固定实际录音 | object_id, take_id | read |
| locate_audio | 定位录音中的歌词出场 | object_id, take_id, time_ms | read |
| export_lyrics | 导出标记歌词 | object_id | read |
| export_review | 导出完整离线歌词审核本 | object_id | read |
| export_lrc | 导出当前完整LRC | object_id, take_id | read |
| audio_handoff | 准备有声剧或视频固定交接 | object_id, take_id, target | read |
