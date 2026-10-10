import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Field, H2, Header, Meta, NavBtn, Screen, SectionTitle, Sheet, Body, useNav } from '../ui';
import type { Data, NutriTargets, Recipe, Slot } from '../types';
import { SLOTS, autoTargets, effectiveTargets, dayMacros, itemLabel, itemMacros, mondayOf, recipeMacros, shoppingList, slotMacros, weekDates, type Macros } from '../nutrition/calc';
import { AddMealSheet, MacroLine } from '../sheets/AddMealSheet';
import { RecipeSheet } from '../sheets/RecipeSheet';
import { dayStr, fDate, fDateL, fmt, parseNum } from '../logic';
import { kv } from '../platform/storage';

type View_ = 'jour' | 'semaine' | 'recettes' | 'courses';
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);


function Segmented({ value, onChange }: { value: View_; onChange: (v: View_) => void }) {
  const t = useTheme();
  const items: [View_, string][] = [['jour', 'Jour'], ['semaine', 'Semaine'], ['recettes', 'Recettes'], ['courses', 'Courses']];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.sunk, borderRadius: 9, padding: 2 }}>
      {items.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} style={{ flex: 1, paddingVertical: 7, borderRadius: 7, backgroundColor: value === k ? t.surface : 'transparent', alignItems: 'center' }}>
          <Text style={{ color: t.ink, fontWeight: value === k ? '600' : '400', fontSize: 14 }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Bar({ label, value, plan, target, color }: { label: string; value: number; plan: number; target: number; color: string }) {
  const t = useTheme();
  const w = (x: number) => `${Math.min(100, Math.max(0, (x / Math.max(1, target)) * 100))}%` as const;
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <View>
        <Meta style={{ fontSize: 13 }}>{label}</Meta>
        <Text style={{ color: t.ink, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {Math.round(value)}
          <Text style={{ color: t.muted, fontWeight: '400' }}> / {Math.round(target)} g</Text>
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunk, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w(value + plan), backgroundColor: color, opacity: 0.3 }} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w(value), backgroundColor: color }} />
      </View>
    </View>
  );
}

/* ---------- Objectifs ---------- */
function TargetsSheet({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const { data, setTargets } = useStore();
  const [mode, setMode] = useState<NutriTargets['mode']>(data.nutri.mode);
  const [deficit, setDeficit] = useState(data.nutri.deficit);
  const [weight, setWeight] = useState(data.nutri.weightKg ? String(data.nutri.weightKg) : '');
  const [kcal, setKcal] = useState(String(data.nutri.kcal));
  const [p, setP] = useState(String(data.nutri.p));
  const [c, setC] = useState(String(data.nutri.c));
  const [f, setF] = useState(String(data.nutri.f));
  const auto = autoTargets({ ...data, nutri: { ...data.nutri, weightKg: parseNum(weight) || undefined } }, deficit);
  const hasGarminWeight = !!data.garmin?.weights.length;

  const save = () => {
    if (mode === 'auto') setTargets({ mode, deficit, weightKg: parseNum(weight) || undefined, ...(auto.source !== 'aucune' ? { kcal: auto.kcal, p: auto.p, c: auto.c, f: auto.f } : {}) });
    else setTargets({ mode, kcal: parseNum(kcal), p: parseNum(p), c: parseNum(c), f: parseNum(f) });
    onClose();
  };
  return (
    <Sheet visible onClose={onClose}>
      <H2>Objectifs du jour</H2>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label="Calcul automatique" active={mode === 'auto'} onPress={() => setMode('auto')} />
        <Chip label="Mes valeurs" active={mode === 'manual'} onPress={() => setMode('manual')} />
      </View>
      {mode === 'auto' ? (
        <>
          <Meta>Pour perdre du gras en gardant le muscle : ta dépense moins un déficit, protéines à 2 g par kilo, lipides à 0,8 g par kilo, le reste en glucides.</Meta>
          {!hasGarminWeight ? <Field label="Ton poids (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="80" /> : null}
          <View style={{ gap: 6 }}>
            <Meta style={{ fontWeight: '600' }}>Déficit</Meta>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[10, 15, 20].map((x) => (
                <Chip key={x} label={`${x} %${x === 15 ? ' (conseillé)' : ''}`} active={deficit === x} onPress={() => setDeficit(x)} />
              ))}
            </View>
          </View>
          {auto.source === 'aucune' ? (
            <Meta>Renseigne ton poids (ou connecte ta balance Garmin) pour calculer tes objectifs.</Meta>
          ) : (
            <Card style={{ gap: 6 }}>
              <Text style={{ color: t.ink, fontSize: 28, fontWeight: '700' }}>{fmt(auto.kcal)} kcal / jour</Text>
              <MacroLine m={auto} />
              <Meta style={{ fontSize: 13 }}>
                {auto.source === 'garmin'
                  ? `Dépense moyenne mesurée par ta montre sur 14 jours : ${fmt(auto.maintenance ?? 0)} kcal, moins ${deficit} %.`
                  : `Dépense estimée (${fmt(auto.weight ?? 0)} kg × 31) : ${fmt(auto.maintenance ?? 0)} kcal, moins ${deficit} %. Plus précis une fois Garmin connecté.`}
                {` Poids : ${fmt(auto.weight ?? 0)} kg.`}
              </Meta>
            </Card>
          )}
        </>
      ) : (
        <>
          <Meta>Par exemple les valeurs définies avec ChatGPT.</Meta>
          <Field label="Calories (kcal)" value={kcal} onChangeText={setKcal} keyboardType="number-pad" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Protéines (g)" value={p} onChangeText={setP} keyboardType="number-pad" />
            <Field label="Glucides (g)" value={c} onChangeText={setC} keyboardType="number-pad" />
            <Field label="Lipides (g)" value={f} onChangeText={setF} keyboardType="number-pad" />
          </View>
        </>
      )}
      <Meta style={{ fontSize: 13 }}>Repères généraux, pas un avis médical. Une perte de 0,5 à 1 % du poids par semaine est un bon rythme.</Meta>
      <Btn label="Enregistrer" onPress={save} />
    </Sheet>
  );
}

/* ---------- Jour ---------- */
function DayView({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const t = useTheme();
  const { data, removeMeal, markEaten } = useStore();
  const [add, setAdd] = useState<{ slot: Slot; which: 'plan' | 'eaten' } | null>(null);
  const [targets, setTargetsOpen] = useState(false);
  const today = dayStr(new Date());
  const day = data.days.find((d) => d.id === date);
  const tg = effectiveTargets(data);
  const eaten = dayMacros(day, 'eaten', data);
  const planned = dayMacros(day, 'plan', data);
  const left = tg.kcal - eaten.kcal;
  const shift = (n: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + n);
    setDate(dayStr(d));
  };
  const future = date > today;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <NavBtn label="‹" a11y="Jour précédent" onPress={() => shift(-1)} />
        <Pressable onPress={() => setDate(today)}>
          <Text style={{ color: t.ink, fontSize: 17, fontWeight: '600' }}>{date === today ? "Aujourd'hui" : cap(fDateL(date + 'T12:00:00'))}</Text>
        </Pressable>
        <NavBtn label="›" a11y="Jour suivant" onPress={() => shift(1)} />
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ color: left < 0 ? t.bad : t.ink, fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmt(Math.round(Math.abs(left)))}</Text>
            <Meta>{left < 0 ? 'kcal au-dessus de l\'objectif' : 'kcal restantes'}</Meta>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Meta style={{ fontSize: 13 }}>Mangé {fmt(Math.round(eaten.kcal))}</Meta>
            {planned.kcal ? <Meta style={{ fontSize: 13 }}>Prévu {fmt(Math.round(planned.kcal))}</Meta> : null}
            <Pressable onPress={() => setTargetsOpen(true)} hitSlop={8}>
              <Text style={{ color: t.accent, fontSize: 15 }}>Objectif {fmt(Math.round(tg.kcal))} ›</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Bar label="Protéines" value={eaten.p} plan={planned.p} target={tg.p} color={t.accent} />
          <Bar label="Glucides" value={eaten.c} plan={planned.c} target={tg.c} color={t.good} />
          <Bar label="Lipides" value={eaten.f} plan={planned.f} target={tg.f} color="#FF9F0A" />
        </View>
      </Card>

      {SLOTS.map((s) => {
        const e = day?.eaten[s.id] ?? [];
        const p = day?.plan[s.id] ?? [];
        const tot = slotMacros(e, data).kcal;
        return (
          <React.Fragment key={s.id}>
            <SectionTitle>
              {s.label}
              {tot ? ` · ${Math.round(tot)} kcal` : ''}
            </SectionTitle>
            <Card pad={false}>
              {e.map((it, k) => (
                <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingRight: 12, marginLeft: 16, borderBottomWidth: 0.5, borderBottomColor: t.line }}>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontSize: 16 }}>{itemLabel(it, data)}</Body>
                    <Meta style={{ fontSize: 13 }}>
                      {Math.round(itemMacros(it, data).kcal)} kcal · {Math.round(itemMacros(it, data).p)} g prot
                    </Meta>
                  </View>
                  <Pressable onPress={() => removeMeal(date, s.id, 'eaten', it.id)} hitSlop={8} accessibilityLabel="Retirer">
                    <Text style={{ color: t.muted, fontSize: 17 }}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {p.map((it) => (
                <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingRight: 12, marginLeft: 16, borderBottomWidth: 0.5, borderBottomColor: t.line }}>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontSize: 16, color: t.muted }}>{itemLabel(it, data)}</Body>
                    <Meta style={{ fontSize: 13 }}>Prévu · {Math.round(itemMacros(it, data).kcal)} kcal</Meta>
                  </View>
                  {!future ? <Btn small kind="ghost" label="Mangé" onPress={() => markEaten(date, s.id, it.id)} /> : null}
                  <Pressable onPress={() => removeMeal(date, s.id, 'plan', it.id)} hitSlop={8} accessibilityLabel="Retirer">
                    <Text style={{ color: t.muted, fontSize: 17 }}>✕</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => setAdd({ slot: s.id, which: future ? 'plan' : 'eaten' })} accessibilityRole="button">
                {({ pressed }) => <Text style={{ color: t.accent, fontSize: 16, paddingVertical: 11, paddingHorizontal: 16, opacity: pressed ? 0.4 : 1 }}>+ Ajouter</Text>}
              </Pressable>
            </Card>
          </React.Fragment>
        );
      })}
      {add ? <AddMealSheet date={date} slot={add.slot} which={add.which} onClose={() => setAdd(null)} /> : null}
      {targets ? <TargetsSheet onClose={() => setTargetsOpen(false)} /> : null}
    </>
  );
}

/* ---------- Semaine ---------- */
function WeekView({ openDay }: { openDay: (d: string) => void }) {
  const t = useTheme();
  const { data, copyPlan } = useStore();
  const { toast } = useNav();
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const dates = weekDates(monday);
  const prev = useMemo(() => {
    const m = new Date(monday);
    m.setDate(m.getDate() - 7);
    return weekDates(m);
  }, [monday]);
  const tg = effectiveTargets(data);
  const move = (n: number) => {
    const m = new Date(monday);
    m.setDate(m.getDate() + 7 * n);
    setMonday(m);
  };
  const prevHasPlan = data.days.some((d) => prev.includes(d.id) && Object.values(d.plan).some((x) => x?.length));
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <NavBtn label="‹" a11y="Semaine précédente" onPress={() => move(-1)} />
        <Text style={{ color: t.ink, fontSize: 17, fontWeight: '600' }}>
          Semaine du {fDate(dates[0] + 'T12:00:00')}
        </Text>
        <NavBtn label="›" a11y="Semaine suivante" onPress={() => move(1)} />
      </View>
      <Card pad={false}>
        {dates.map((d, i) => {
          const day = data.days.find((x) => x.id === d);
          const m = dayMacros(day, 'plan', data);
          const e = dayMacros(day, 'eaten', data);
          const names = SLOTS.flatMap((s) => [...(day?.eaten[s.id] ?? []), ...(day?.plan[s.id] ?? [])].map((it) => itemLabel(it, data).split(' · ')[0])).join(', ');
          const total = m.kcal + e.kcal;
          return (
            <Pressable key={d} onPress={() => openDay(d)}>
              {({ pressed }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingRight: 12, marginLeft: 16, borderTopWidth: i ? 0.5 : 0, borderTopColor: t.line, opacity: pressed ? 0.5 : 1 }}>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontSize: 16 }}>{cap(fDateL(d + 'T12:00:00'))}</Body>
                    <Meta style={{ fontSize: 13 }} numberOfLines={2}>
                      {names || 'Rien de prévu'}
                    </Meta>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                    <Text style={{ color: total > tg.kcal * 1.05 ? t.bad : total ? t.ink : t.muted, fontSize: 15, fontVariant: ['tabular-nums'] }}>{total ? `${fmt(Math.round(total))} kcal` : '—'}</Text>
                  </View>
                  <Text style={{ color: t.muted, fontSize: 22, fontWeight: '300', marginLeft: 8 }}>›</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </Card>
      <Meta style={{ marginHorizontal: 16, marginTop: -8, fontSize: 13 }}>Objectif {fmt(Math.round(tg.kcal))} kcal par jour. Touche un jour pour prévoir ses repas.</Meta>
      {prevHasPlan ? (
        <Btn
          kind="ghost"
          label="Reprendre le planning de la semaine précédente"
          onPress={() => {
            copyPlan(prev, dates);
            toast('Planning copié');
          }}
        />
      ) : null}
    </>
  );
}

/* ---------- Recettes ---------- */
function RecipesView({ onAdd }: { onAdd: (r: Recipe) => void }) {
  const t = useTheme();
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null | undefined>(undefined);
  const list = data.recipes
    .filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map((r) => ({ r, m: recipeMacros(r, data.foods) }))
    .sort((a, b) => a.r.name.localeCompare(b.r.name, 'fr'));
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Field value={q} onChangeText={setQ} placeholder="Chercher une recette" autoCorrect={false} />
        </View>
        <Btn small label="Nouvelle" onPress={() => setOpen(null)} />
      </View>
      <Card pad={false}>
        {list.map(({ r, m }, i) => (
          <Pressable key={r.id} onPress={() => setOpen(r.id)}>
            {({ pressed }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingRight: 12, marginLeft: 16, borderTopWidth: i ? 0.5 : 0, borderTopColor: t.line, opacity: pressed ? 0.5 : 1 }}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontSize: 16 }}>{r.name}</Body>
                  <Meta style={{ fontSize: 13 }}>
                    {Math.round(m.kcal)} kcal · {Math.round(m.p)} g prot / portion · {r.minutes} min
                    {r.servings > 1 ? ` · ${r.servings} portions` : ''}
                  </Meta>
                </View>
                <Text style={{ color: t.muted, fontSize: 22, fontWeight: '300' }}>›</Text>
              </View>
            )}
          </Pressable>
        ))}
      </Card>
      {open !== undefined ? <RecipeSheet id={open} onClose={() => setOpen(undefined)} onAdd={(r) => { setOpen(undefined); onAdd(r); }} /> : null}
    </>
  );
}

/* ---------- Courses ---------- */
const qtyLabel = (g: number, unit?: { name: string; g: number }) => {
  const w = g >= 1000 ? `${fmt(Math.round(g / 100) / 10)} kg` : `${Math.round(g)} g`;
  if (unit && unit.g >= 20) {
    const n = Math.ceil(g / unit.g - 0.1);
    return `${n} ${unit.name}${n > 1 && !unit.name.endsWith('s') && !unit.name.includes(' ') ? 's' : ''} (${w})`;
  }
  return w;
};

function ShoppingView() {
  const t = useTheme();
  const { data } = useStore();
  const { toast } = useNav();
  const [range, setRange] = useState<'cette' | 'prochaine'>('cette');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const today = dayStr(new Date());
  const monday = mondayOf(new Date());
  if (range === 'prochaine') monday.setDate(monday.getDate() + 7);
  const dates = weekDates(monday).filter((d) => d >= today);
  const key = 'cdf.courses.' + dayStr(monday);
  useEffect(() => {
    kv.get(key).then((s) => setChecked(s ? JSON.parse(s) : {})).catch(() => setChecked({}));
  }, [key]);
  const toggle = (id: string) => {
    const n = { ...checked, [id]: !checked[id] };
    setChecked(n);
    kv.set(key, JSON.stringify(n)).catch(() => {});
  };
  const lines = shoppingList(data.days, dates, data);
  const cats = [...new Set(lines.map((l) => l.food.cat ?? 'Autres'))];
  const copy = async () => {
    const txt = cats.map((c) => `${c}\n` + lines.filter((l) => (l.food.cat ?? 'Autres') === c).map((l) => `- ${l.food.name} : ${qtyLabel(l.g, l.food.unit)}`).join('\n')).join('\n\n');
    await Clipboard.setStringAsync(txt);
    toast('Liste copiée');
  };
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label="Cette semaine" active={range === 'cette'} onPress={() => setRange('cette')} />
        <Chip label="Semaine prochaine" active={range === 'prochaine'} onPress={() => setRange('prochaine')} />
      </View>
      {!lines.length ? (
        <Card>
          <Meta>Rien à acheter : la liste se remplit avec les repas prévus (onglet Semaine) à partir d'aujourd'hui.</Meta>
        </Card>
      ) : (
        <>
          {cats.map((c) => (
            <React.Fragment key={c}>
              <SectionTitle>{c}</SectionTitle>
              <Card pad={false}>
                {lines
                  .filter((l) => (l.food.cat ?? 'Autres') === c)
                  .map((l, i) => {
                    const on = !!checked[l.food.id];
                    return (
                      <Pressable key={l.food.id} onPress={() => toggle(l.food.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingRight: 14, marginLeft: 16, borderTopWidth: i ? 0.5 : 0, borderTopColor: t.line }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {on ? <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
                          </View>
                          <Body style={{ flex: 1, fontSize: 16, color: on ? t.muted : t.ink, textDecorationLine: on ? 'line-through' : 'none' }}>{l.food.name}</Body>
                          <Meta>{qtyLabel(l.g, l.food.unit)}</Meta>
                        </View>
                      </Pressable>
                    );
                  })}
              </Card>
            </React.Fragment>
          ))}
          <Btn kind="ghost" label="Copier la liste" onPress={copy} />
        </>
      )}
    </>
  );
}

/* ---------- Écran ---------- */
export function Nutrition() {
  const [view, setView] = useState<View_>('jour');
  const [date, setDate] = useState(dayStr(new Date()));
  const [addRecipe, setAddRecipe] = useState<Recipe | null>(null);
  return (
    <Screen header={<Header title="Nutrition" />}>
      <Segmented value={view} onChange={setView} />
      {view === 'jour' ? <DayView date={date} setDate={setDate} /> : null}
      {view === 'semaine' ? (
        <WeekView
          openDay={(d) => {
            setDate(d);
            setView('jour');
          }}
        />
      ) : null}
      {view === 'recettes' ? <RecipesView onAdd={(r) => setAddRecipe(r)} /> : null}
      {view === 'courses' ? <ShoppingView /> : null}
      {addRecipe ? (
        <AddMealSheet date={date} slot="dej" which={date > dayStr(new Date()) ? 'plan' : 'eaten'} recipe={addRecipe} onClose={() => setAddRecipe(null)} />
      ) : null}
    </Screen>
  );
}
