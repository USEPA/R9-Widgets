import {getAppStore} from 'jimu-core';

export function getWidgetLayouts(state, widgetId) {
  return Object.keys(state.appConfig.layouts)
    .filter(k => {
      if (state.appConfig.layouts[k].content === undefined) {
        return false
      }
      const found = Object.keys(state.appConfig.layouts[k].content)
        .find(c => state.appConfig.layouts[k].content[c].type === 'WIDGET' &&
          state.appConfig.layouts[k].content[c].widgetId === widgetId)
      return found !== undefined;
    })
    .map(k => k)
}

export function getViewIDs(state, widgetId) {
  const viewIds = new Set()
  const layoutIds = getWidgetLayouts(state, widgetId)
  Object.keys(state.appConfig.views).forEach(v => {
    Object.keys(state.appConfig.views[v].layout).forEach(l => {
      if (layoutIds.includes(state.appConfig.views[v].layout[l])) {
        viewIds.add(v)
      }
    })
  })
  return viewIds;
}

export function visibilityChanged(currentState, currentVisibility, viewIds) {
  let visible = false;
  if (currentState.appRuntimeInfo.hasOwnProperty('sectionNavInfos')) {
    viewIds.forEach(v => {
      Object.keys(currentState.appRuntimeInfo.sectionNavInfos).forEach(s => {
        if (currentState.appRuntimeInfo.sectionNavInfos[s].currentViewId === v) {
          visible = true
        }
      })
    })
  } else {
    // might not be fully loaded so just return current visibility
    return currentVisibility
  }
  return currentVisibility !== visible
}

export function isViewVisible(viewIds, state) {
  let visible = false
  viewIds.forEach(v => {
    Object.keys(state.appRuntimeInfo.sectionNavInfos).forEach(s => {
      if (state.appRuntimeInfo.sectionNavInfos[s].currentViewId === v) {
        visible = true
      }
    })
  })
  return visible
}

export function listenForViewVisibilityChanges(widgetId, callback) {
  const appStore = getAppStore()
  const viewIds = getViewIDs(appStore.getState(), widgetId)
  // if (visibilityChanged(appStore.getState(), this.state?.visible === true, this.viewIds)) {
  //   this.setState({visible: !(this.state?.visible === true)})
  // }
  let currentVisibility = false
  appStore.subscribe(() => {
    const s = getAppStore().getState()
    if (visibilityChanged(s, currentVisibility, viewIds)) {
      currentVisibility = !currentVisibility
      callback(currentVisibility)
      // this.setState({visible: !(this.state?.visible === true)})
    }
  })
}
