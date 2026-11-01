package com.momcare.app.ui

import android.app.Application
import com.momcare.app.data.Child
import com.momcare.app.ui.nav.Visibility
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine

/** 앱 전역 상태: 잠금 해제 여부, 아이 목록, 선택된 아이, 기능 표시 설정 */
class RootViewModel(app: Application) : BaseViewModel(app) {

    val unlocked: StateFlow<Boolean> = prefs.unlocked

    val children: StateFlow<List<Child>> = db.childDao().observeAll().asState(emptyList())

    val momName: StateFlow<String> = prefs.momName

    val visibility: StateFlow<Visibility> = visibilityFlow()

    fun unlock() = prefs.setUnlocked(true)

    fun select(id: Long) = prefs.setSelectedChild(id)

    /** 선택된 아이가 없거나 삭제되었으면 첫 번째 아이로 보정 */
    fun resolveSelected(list: List<Child>, selectedId: Long): Child? =
        list.firstOrNull { it.id == selectedId } ?: list.firstOrNull()
}

/** 표시 설정 3개를 하나의 상태로 합친다 */
fun BaseViewModel.visibilityFlow(): StateFlow<Visibility> {
    val p = prefs
    return combine(p.showChild, p.showPregnancy, p.showDiaper) { c, pr, d -> Visibility(c, pr, d) }
        .stateInVm(Visibility(p.showChild.value, p.showPregnancy.value, p.showDiaper.value))
}
