"""개별 쓰기 연산과 그 역연산.

연산 하나 = 유닛 50 = 재개 가능한 최소 단위. 각 연산은 실행 후 자신을 되돌릴
방법(역연산)을 함께 돌려주고, 그게 되돌리기 저널에 쌓인다.

작업 컨텍스트($ref):
    "재생목록을 만들고 거기에 영상 200개를 넣는다" 같은 작업은 나중 연산이
    앞 연산의 결과(새 재생목록 ID)를 알아야 한다. 하지만 그 ID는 실행 전에는
    존재하지 않고, 작업이 며칠에 걸쳐 나뉘어 돌 수도 있다.
    그래서 참조를 이름으로 적어두고("$ref:요리"), 실행 시점에 컨텍스트에서
    해결한다. 컨텍스트는 DB에 저장되므로 앱을 껐다 켜도 유지된다.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable

log = logging.getLogger(__name__)

REF_PREFIX = "$ref:"


@dataclass
class OpContext:
    api: object
    db: object
    params: dict
    job_id: int
    context: dict  # 작업 내부에서 공유하는 이름 -> 실제 ID

    def resolve(self, key: str, default: str = "") -> str:
        """params[key]를 읽되 '$ref:이름'이면 컨텍스트에서 실제 ID로 바꾼다."""
        value = self.params.get(key, default)
        if isinstance(value, str) and value.startswith(REF_PREFIX):
            name = value[len(REF_PREFIX):]
            resolved = self.context.get(name)
            if not resolved:
                raise OpDependencyError(
                    f"'{name}' 참조를 아직 못 풀었어 — 앞선 연산이 실패했을 가능성이 높아"
                )
            return resolved
        return value


@dataclass
class UndoEntry:
    inverse_type: str
    inverse_params: dict
    label: str = ""


@dataclass
class OpResult:
    result: dict = field(default_factory=dict)
    undo: UndoEntry | None = None
    context_updates: dict = field(default_factory=dict)
    skipped: bool = False
    note: str = ""


class OpDependencyError(Exception):
    """선행 연산이 실패해 이 연산을 할 수 없음. 재시도해도 소용없다."""


def ref(name: str) -> str:
    """작업을 만들 때 '아직 없는 ID'를 가리키는 참조를 만든다."""
    return f"{REF_PREFIX}{name}"


# ---- 구독 ---------------------------------------------------------------

def op_unsubscribe(ctx: OpContext) -> OpResult:
    subscription_id = ctx.resolve("subscription_id")
    channel_id = ctx.params.get("channel_id", "")
    title = ctx.params.get("channel_title", channel_id)

    ctx.api.unsubscribe(subscription_id, job_id=ctx.job_id)
    ctx.db.execute("UPDATE channels SET status='gone' WHERE channel_id=?", (channel_id,))

    return OpResult(
        result={"subscription_id": subscription_id},
        # 되돌리기는 '다시 구독'이다. 새 구독 ID가 생기므로 원래 ID는 못 살린다.
        undo=UndoEntry("subscribe", {"channel_id": channel_id}, f"{title} 다시 구독"),
    )


def op_subscribe(ctx: OpContext) -> OpResult:
    channel_id = ctx.resolve("channel_id")
    response = ctx.api.subscribe(channel_id, job_id=ctx.job_id)
    new_id = response.get("id", "")

    ctx.db.execute(
        "UPDATE channels SET status='active', subscription_id=? WHERE channel_id=?",
        (new_id, channel_id),
    )
    return OpResult(
        result={"subscription_id": new_id},
        undo=UndoEntry("unsubscribe",
                       {"subscription_id": new_id, "channel_id": channel_id},
                       "구독 취소"),
    )


# ---- 재생목록 -----------------------------------------------------------

def op_create_playlist(ctx: OpContext) -> OpResult:
    title = ctx.params["title"]
    ref_name = ctx.params.get("ref_name", "")

    response = ctx.api.create_playlist(
        title,
        description=ctx.params.get("description", ""),
        privacy=ctx.params.get("privacy", "private"),
        job_id=ctx.job_id,
    )
    playlist_id = response.get("id", "")

    return OpResult(
        result={"playlist_id": playlist_id},
        undo=UndoEntry("delete_playlist", {"playlist_id": playlist_id},
                       f"재생목록 '{title}' 삭제"),
        # 뒤따르는 add_item 연산들이 이 ID를 찾아 쓴다
        context_updates={ref_name: playlist_id} if ref_name else {},
    )


def op_delete_playlist(ctx: OpContext) -> OpResult:
    playlist_id = ctx.resolve("playlist_id")
    ctx.api.delete_playlist(playlist_id, job_id=ctx.job_id)
    ctx.db.execute("DELETE FROM playlists WHERE playlist_id=?", (playlist_id,))
    ctx.db.execute("DELETE FROM playlist_items WHERE playlist_id=?", (playlist_id,))

    # 재생목록 삭제는 되돌릴 수 없다. 다시 만들어도 항목마다 50유닛이 들고
    # 원래 항목 순서·추가 시각도 복원되지 않는다. 그래서 역연산을 달지 않고,
    # UI가 실행 전에 강하게 경고한다.
    return OpResult(result={"playlist_id": playlist_id},
                    note="재생목록 삭제는 되돌릴 수 없어")


def op_add_item(ctx: OpContext) -> OpResult:
    playlist_id = ctx.resolve("playlist_id")
    video_id = ctx.params["video_id"]
    position = ctx.params.get("position")

    response = ctx.api.add_to_playlist(playlist_id, video_id, position, job_id=ctx.job_id)
    item_id = response.get("id", "")

    return OpResult(
        result={"item_id": item_id},
        undo=UndoEntry("remove_item",
                       {"item_id": item_id, "playlist_id": playlist_id,
                        "video_id": video_id},
                       "추가한 영상 빼기"),
    )


def op_remove_item(ctx: OpContext) -> OpResult:
    item_id = ctx.resolve("item_id")
    playlist_id = ctx.params.get("playlist_id", "")
    video_id = ctx.params.get("video_id", "")
    # 되돌릴 때 원래 자리로 넣기 위해 위치를 남겨둔다
    position = ctx.params.get("position")

    ctx.api.remove_playlist_item(item_id, job_id=ctx.job_id)
    ctx.db.execute("DELETE FROM playlist_items WHERE item_id=?", (item_id,))

    undo_params = {"playlist_id": playlist_id, "video_id": video_id}
    if position is not None:
        undo_params["position"] = position

    return OpResult(
        result={"item_id": item_id},
        undo=UndoEntry("add_item", undo_params, "뺀 영상 되돌리기") if video_id else None,
    )


def op_move_item(ctx: OpContext) -> OpResult:
    item_id = ctx.resolve("item_id")
    playlist_id = ctx.resolve("playlist_id")
    video_id = ctx.params["video_id"]
    to_position = int(ctx.params["position"])
    from_position = ctx.params.get("from_position")

    ctx.api.move_playlist_item(item_id, playlist_id, video_id, to_position,
                               job_id=ctx.job_id)

    undo = None
    if from_position is not None:
        undo = UndoEntry("move_item",
                         {"item_id": item_id, "playlist_id": playlist_id,
                          "video_id": video_id, "position": from_position,
                          "from_position": to_position},
                         "원래 순서로")
    return OpResult(result={"item_id": item_id, "position": to_position}, undo=undo)


HANDLERS: dict[str, Callable[[OpContext], OpResult]] = {
    "unsubscribe": op_unsubscribe,
    "subscribe": op_subscribe,
    "create_playlist": op_create_playlist,
    "delete_playlist": op_delete_playlist,
    "add_item": op_add_item,
    "remove_item": op_remove_item,
    "move_item": op_move_item,
}

# 연산 종류별 비용 산정에 쓰는 API 메서드. 미리보기에서 유닛을 계산한다.
OP_METHODS: dict[str, str] = {
    "unsubscribe": "subscriptions.delete",
    "subscribe": "subscriptions.insert",
    "create_playlist": "playlists.insert",
    "delete_playlist": "playlists.delete",
    "add_item": "playlistItems.insert",
    "remove_item": "playlistItems.delete",
    "move_item": "playlistItems.update",
}

# 사람이 읽는 이름
OP_LABELS: dict[str, str] = {
    "unsubscribe": "구독 취소",
    "subscribe": "구독",
    "create_playlist": "재생목록 만들기",
    "delete_playlist": "재생목록 삭제",
    "add_item": "영상 추가",
    "remove_item": "영상 빼기",
    "move_item": "순서 변경",
}
