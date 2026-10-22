import { isDirty, useStore } from "../state/store";

export default function Tabs() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);

  if (tabs.length === 0) return <div className="tabbar empty" />;

  return (
    <div className="tabbar">
      {tabs.map((tab) => {
        const dirty = isDirty(tab);
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`tab ${active ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            role="button"
            tabIndex={0}
          >
            <span className="tab-name">{tab.name}</span>
            <button
              className="tab-close"
              title={dirty ? "Unsaved changes" : "Close"}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              {dirty ? <span className="dirty-dot" /> : <span className="close-x">×</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
