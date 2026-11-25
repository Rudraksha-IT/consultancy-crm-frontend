"use client";

import { SelectField } from "@/components/ui/SelectField";
import { LABELS } from "@/constants/messages";
import {
  ACCENT_PRESETS,
  AUTO_ACCENT,
  deriveOfficeTokens,
  DARK_BASES,
  DARK_SIDEBAR_LABELS,
  DARK_SIDEBAR_MODES,
  normaliseThemeConfig,
  PAGE_BACKGROUNDS,
  SIDEBAR_PRESETS,
  THEME_PRESETS,
  type ThemeConfig,
} from "@/lib/theme";

import { ColourPicker } from "./ColourPicker";

type ThemeEditorProps = {
  value: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
};

const PRESET_OPTIONS = [
  { value: "", label: LABELS.chooseOne },
  ...THEME_PRESETS.map((preset) => ({ value: preset.name, label: preset.name })),
];

/** Pick a Theme: a ready-made one, or the page, sidebar and accent colours with dark-mode choices. */
export function ThemeEditor({ value, onChange }: ThemeEditorProps) {
  const isAccentAdjusted = deriveOfficeTokens(value).isAccentAdjusted;
  // Every change goes through the same checks the saved Theme will, so the preview is honest.
  const change = (patch: Partial<ThemeConfig>): void => {
    onChange(normaliseThemeConfig({ ...value, ...patch }));
  };
  const changeDark = (patch: Partial<ThemeConfig["dark"]>): void => {
    change({ dark: { ...value.dark, ...patch } });
  };

  return (
    <div className="grid gap-5">
      <SelectField
        label={LABELS.readyMadeColours}
        name="preset"
        isOptional
        value=""
        options={PRESET_OPTIONS}
        onChange={(name) => {
          const preset = THEME_PRESETS.find((item) => item.name === name);
          if (preset !== undefined) onChange(preset.config);
        }}
      />
      <div className="tablet:grid-cols-2 grid gap-5">
        <SelectField
          label={LABELS.pageBackground}
          name="page"
          value={value.page}
          options={PAGE_BACKGROUNDS.map((page) => ({ value: page.name, label: page.label }))}
          onChange={(page) => {
            change({ page: normaliseThemeConfig({ ...value, page }).page });
          }}
        />
        <ColourPicker
          label={LABELS.sidebar}
          name="sidebar"
          value={value.sidebar}
          presets={SIDEBAR_PRESETS}
          fallbackHex={value.sidebar}
          onChange={(sidebar) => {
            change({ sidebar });
          }}
        />
        <div className="grid gap-2">
          <ColourPicker
            label={LABELS.accent}
            name="accent"
            value={value.accent}
            presets={ACCENT_PRESETS}
            fallbackHex={value.accent}
            onChange={(accent) => {
              change({ accent });
            }}
          />
          {isAccentAdjusted && <p className="text-small text-ink-2">{LABELS.accentAdjusted}</p>}
        </div>
      </div>
      <h3 className="text-card-title">{LABELS.darkMode}</h3>
      <div className="tablet:grid-cols-2 grid gap-5">
        <SelectField
          label={LABELS.darkBackground}
          name="darkBase"
          value={value.dark.base}
          options={DARK_BASES.map((base) => ({ value: base.name, label: base.label }))}
          onChange={(base) => {
            changeDark({ base: normaliseThemeConfig({ dark: { base } }).dark.base });
          }}
        />
        <SelectField
          label={LABELS.darkSidebar}
          name="darkSidebar"
          value={value.dark.sidebar}
          options={DARK_SIDEBAR_MODES.map((mode) => ({
            value: mode,
            label: DARK_SIDEBAR_LABELS[mode],
          }))}
          onChange={(sidebar) => {
            changeDark({ sidebar: normaliseThemeConfig({ dark: { sidebar } }).dark.sidebar });
          }}
        />
        <ColourPicker
          label={LABELS.darkAccent}
          name="darkAccent"
          value={value.dark.accent}
          presets={ACCENT_PRESETS}
          leadingOptions={[{ value: AUTO_ACCENT, label: LABELS.automaticAccent }]}
          fallbackHex={value.accent}
          onChange={(accent) => {
            changeDark({ accent });
          }}
        />
      </div>
    </div>
  );
}
