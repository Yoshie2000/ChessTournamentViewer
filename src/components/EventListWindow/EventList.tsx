import { memo, useMemo, useState, useEffect } from "react";
import { Spin } from "antd";
import { ConfigProvider, theme, TreeSelect } from "antd";
import {
  useEventStore,
  PROVIDERS,
  type ProviderKey,
} from "../../context/EventContext";
import type { CCCEventsListUpdate } from "../../types";
import "./EventList.css";

function encodeProviderValue(provider: ProviderKey) {
  return `provider:${provider}`;
}

function encodeGroupValue(provider: ProviderKey, group: string) {
  return `group:${provider}:${group}`;
}

function encodeSubgroupValue(
  provider: ProviderKey,
  group: string,
  subgroup: string
) {
  return `subgroup:${provider}:${group}:${subgroup}`;
}

function encodeEventValue(provider: ProviderKey, eventId: string | number) {
  return `event:${provider}:${eventId}`;
}

function decodeValue(
  value: string
): { kind: "event"; provider: ProviderKey; eventId: string } | null {
  const parts = value.split(":");
  if (parts[0] === "event" && parts[1] && parts[2]) {
    return {
      kind: "event",
      provider: parts[1] as ProviderKey,
      eventId: parts[2],
    };
  }
  return null;
}

function groupNode(provider: ProviderKey, title: string, children: object[]) {
  return {
    title,
    value: encodeGroupValue(provider, title),
    key: encodeGroupValue(provider, title),
    selectable: false,
    children,
  };
}

function subgroupNode(
  provider: ProviderKey,
  group: string,
  title: string,
  children: object[]
) {
  return {
    title,
    value: encodeSubgroupValue(provider, group, title),
    key: encodeSubgroupValue(provider, group, title),
    selectable: false,
    children,
  };
}

function eventLeaf(
  provider: ProviderKey,
  id: string | number,
  title: string,
  fullLabel: string
) {
  return {
    title,
    fullLabel,
    value: encodeEventValue(provider, id),
    key: encodeEventValue(provider, id),
    isLeaf: true,
  };
}

function cccSeasonFromName(name: string): string {
  const match = name.match(/^CCC\s*(\d+)/i);
  return match ? `CCC ${match[1]}` : "Other";
}

function buildCCCTree(
  provider: ProviderKey,
  eventList: CCCEventsListUpdate
): object[] {
  const seasonMap = new Map<string, typeof eventList.events>();
  for (const event of eventList.events) {
    const season = cccSeasonFromName(event.name);
    if (!seasonMap.has(season)) seasonMap.set(season, []);
    seasonMap.get(season)!.push(event);
  }

  return Array.from(seasonMap.entries()).map(([season, events]) =>
    groupNode(
      provider,
      season,
      events.map((e) =>
        eventLeaf(
          provider,
          e.id,
          `${e.name}${e.tc ? ` (${e.tc.init}+${e.tc.incr})` : ""}`,
          `${season} › ${e.name}${e.tc ? ` (${e.tc.init}+${e.tc.incr})` : ""}`
        )
      )
    )
  );
}

type TCECCategory =
  | "Leagues & Divisions"
  | "Superfinal"
  | "Cup"
  | "Swiss"
  | "Fischer Random"
  | "Testing"
  | "Bonus"
  | "Other";

function tcecCategory(subName: string): TCECCategory {
  const n = subName.toLowerCase();
  if (n.includes("testing")) return "Testing";
  if (n.includes("bonus")) return "Bonus";
  if (n.includes("superfinal") || n.includes("elite-match"))
    return "Superfinal";
  if (n.includes("cup")) return "Cup";
  if (n.includes("swiss")) return "Swiss";
  if (
    n.includes("frd") ||
    n.includes("fischer") ||
    n.includes("frc") ||
    n.includes("960")
  )
    return "Fischer Random";
  if (
    n.includes("division") ||
    n.includes("league") ||
    n.includes("stage") ||
    n.includes("divp") ||
    n.includes("div ")
  )
    return "Leagues & Divisions";
  return "Other";
}

const CATEGORY_ORDER: TCECCategory[] = [
  "Leagues & Divisions",
  "Superfinal",
  "Cup",
  "Swiss",
  "Fischer Random",
  "Testing",
  "Bonus",
  "Other",
];

function buildTCECTree(
  provider: ProviderKey,
  eventList: CCCEventsListUpdate
): object[] {
  const seasonMap = new Map<
    string,
    Map<TCECCategory, typeof eventList.events>
  >();

  for (const event of eventList.events) {
    const dashIdx = event.name.indexOf(" - ");
    const season =
      dashIdx !== -1 ? event.name.slice(0, dashIdx) : "Unknown Season";
    const subName = dashIdx !== -1 ? event.name.slice(dashIdx + 3) : event.name;
    const category = tcecCategory(subName);

    if (!seasonMap.has(season)) seasonMap.set(season, new Map());
    const catMap = seasonMap.get(season)!;
    if (!catMap.has(category)) catMap.set(category, []);
    catMap.get(category)!.push(event);
  }

  return Array.from(seasonMap.entries()).map(([season, catMap]) => {
    const categoryNodes = CATEGORY_ORDER.filter((cat) => catMap.has(cat)).map(
      (cat) => {
        const events = catMap.get(cat)!;
        const children = events.map((e) => {
          const subName =
            e.name.indexOf(" - ") !== -1
              ? e.name.slice(e.name.indexOf(" - ") + 3)
              : e.name;
          return eventLeaf(
            provider,
            e.id,
            subName,
            `${season} › ${cat} › ${subName}`
          );
        });
        return subgroupNode(provider, season, cat, children);
      }
    );

    if (categoryNodes.length === 1) {
      const onlyCategory = Array.from(catMap.values())[0];
      return groupNode(
        provider,
        season,
        onlyCategory.map((e) => {
          const subName =
            e.name.indexOf(" - ") !== -1
              ? e.name.slice(e.name.indexOf(" - ") + 3)
              : e.name;
          return eventLeaf(provider, e.id, subName, `${season} › ${subName}`);
        })
      );
    }

    return groupNode(provider, season, categoryNodes);
  });
}

function loadingPlaceholder(provider: ProviderKey): object[] {
  return [
    {
      title: "Loading…",
      value: encodeEventValue(provider, "__loading__"),
      key: encodeEventValue(provider, "__loading__"),
      disabled: true,
      isLeaf: true,
    },
  ];
}

function buildProviderTree(
  provider: ProviderKey,
  eventList: CCCEventsListUpdate | null
): object[] {
  if (!eventList?.events?.length) return loadingPlaceholder(provider);

  switch (provider) {
    case "ccc":
      return buildCCCTree(provider, eventList);
    case "tcec":
      return buildTCECTree(provider, eventList);
    default:
      return eventList.events.map((e) => {
        const label = `${e.name}${e.tc ? ` (${e.tc.init}+${e.tc.incr})` : ""}`;
        return eventLeaf(provider, e.id, label, label);
      });
  }
}

function findMatchedEventId(
  tNr: string,
  eventList: CCCEventsListUpdate
): string | number | null {
  const exact = eventList.events.find((e) => String(e.id) === tNr);
  if (exact) return exact.id;

  const normalized = tNr.toLowerCase();
  const prefix = eventList.events.find(
    (e) =>
      normalized.startsWith(String(e.id).toLowerCase()) ||
      String(e.id).toLowerCase().startsWith(normalized)
  );
  return prefix?.id ?? null;
}

export const EventList = memo(function EventList() {
  const requestEvent = useEventStore((state) => state.requestEvent);
  const activeProvider = useEventStore((state) => state.activeProvider);
  const setActiveProvider = useEventStore((state) => state.setActiveProvider);
  const pendingEventId = useEventStore((state) => state.pendingEventId);
  const setPendingEventId = useEventStore((state) => state.setPendingEventId);
  const providerData = useEventStore((state) => state.providerData);

  const [optimisticValue, setOptimisticValue] = useState<string | undefined>(
    undefined
  );

  const activeSelectedEvent =
    providerData[activeProvider]?.selectedEvent ?? null;
  const activeEventList = providerData[activeProvider]?.eventList ?? null;

  const matchedEventId =
    activeSelectedEvent && activeEventList
      ? findMatchedEventId(
          activeSelectedEvent.tournamentDetails.tNr,
          activeEventList
        )
      : null;

  const realSelectedValue =
    matchedEventId != null
      ? encodeEventValue(activeProvider, matchedEventId)
      : undefined;

  useEffect(() => {
    if (optimisticValue && optimisticValue === realSelectedValue) {
      setOptimisticValue(undefined);
    }
  }, [realSelectedValue, optimisticValue]);

  const selectedValue = optimisticValue ?? realSelectedValue;

  const treeData = useMemo(
    () =>
      (Object.keys(PROVIDERS) as ProviderKey[]).map((providerKey) => ({
        title: PROVIDERS[providerKey].label,
        value: encodeProviderValue(providerKey),
        key: encodeProviderValue(providerKey),
        selectable: false,
        children: buildProviderTree(
          providerKey,
          providerData[providerKey]?.eventList ?? null
        ),
      })),
    [activeProvider, providerData]
  );

  const handleChange = (value: string) => {
    const decoded = decodeValue(value);
    if (!decoded) return;

    const { provider, eventId } = decoded;
    setOptimisticValue(encodeEventValue(provider, eventId));

    const isLiveEvent =
      providerData[provider]?.eventList?.events.at(0)?.id === eventId;

    setPendingEventId(isLiveEvent ? null : eventId);
    if (provider !== activeProvider) {
      setActiveProvider(provider);
    } else {
      requestEvent(undefined, isLiveEvent ? undefined : eventId);
    }
  };

  const isListLoading =
    !providerData.ccc?.eventList && !providerData.tcec?.eventList;

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgElevated: "#343434",
          colorPrimary: "#fafafa",
          controlOutline: "transparent",
          colorPrimaryBg: "#4d4d4d",
        },
        components: { TreeSelect: { indentSize: 14, switcherSize: 15 } },
      }}
    >
      <TreeSelect
        className="eventListContainer"
        style={{ width: "100%", height: "35px" }}
        styles={{ popup: { root: { width: "0" } } }}
        treeExpandAction="click"
        treeData={treeData}
        virtual={true}
        popupMatchSelectWidth={false}
        value={selectedValue}
        onChange={handleChange}
        treeNodeLabelProp="fullLabel"
        treeDefaultExpandAll={false}
        placeholder={isListLoading ? "Loading…" : "Select event"}
        disabled={isListLoading}
        suffixIcon={pendingEventId ? <Spin size="small" /> : undefined}
      />
    </ConfigProvider>
  );
});
