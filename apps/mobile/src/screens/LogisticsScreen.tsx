/**
 * Green logistics. The web app's `/logistics` (PRD FR-41, FR-42, FR-43).
 *
 * Three things a plant can actually act on: compare multi-modal routes for a
 * corridor, pool truck capacity with other shipments, and see what the pooling
 * optimiser saved. The route figures come from the backend's logistics
 * service - the phone sends the corridor and the payload and displays what
 * comes back.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { logistics as logisticsApi } from '../api/endpoints';
import {
  Badge,
  DetailRows,
  GlassPanel,
  Metrics,
  ModuleScreen,
  PageHeading,
  SectionHeading,
  TrustBar,
} from '../components/layout';
import { Button, Chip, EmptyState, Field, Loading, Note } from '../components/ui';
import { CORRIDORS } from '../data/network';
import { label as humanise, money, number } from '../lib/format';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RouteAlternative } from '../api/types';
import type { RootStackParams } from '../navigation/types';

const PRESET_TONE: Record<string, 'positive' | 'accent' | 'high' | 'neutral'> = {
  LOWEST_CARBON: 'positive',
  BALANCED: 'accent',
  FASTEST: 'high',
  CHEAPEST: 'neutral',
};

export default function LogisticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const factoryId = workspace.source === 'live' ? workspace.factoryId : null;

  const [corridorId, setCorridorId] = useState(CORRIDORS[0].id);
  const [payload, setPayload] = useState('12');
  const [error, setError] = useState<string | null>(null);
  const corridor = CORRIDORS.find((item) => item.id === corridorId) ?? CORRIDORS[0];

  const shipments = useQuery({
    queryKey: ['shipments', factoryId],
    queryFn: () => logisticsApi.shipments(factoryId ?? undefined),
    enabled: Boolean(factoryId),
  });

  const plan = useMutation({
    mutationFn: () =>
      logisticsApi.plan({
        origin_gps: corridor.originGps,
        destination_gps: corridor.destinationGps,
        payload_tonnes: Math.max(0.01, Number(payload) || 12),
        cargo_type: corridor.typicalCommodity,
      }),
    onError: (exception) => setError(describeError(exception)),
    onSuccess: () => setError(null),
  });

  const book = useMutation({
    mutationFn: (preset: string) =>
      logisticsApi.createShipment({
        factory_id: factoryId,
        origin_name: corridor.origin,
        origin_lat: corridor.originGps[0],
        origin_lon: corridor.originGps[1],
        destination_name: corridor.destination,
        dest_lat: corridor.destinationGps[0],
        dest_lon: corridor.destinationGps[1],
        payload_tonnes: Math.max(0.01, Number(payload) || 12),
        cargo_type: corridor.typicalCommodity,
        selected_route_preset: preset,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['shipments', factoryId] });
    },
    onError: (exception) => setError(describeError(exception)),
  });

  const pool = useMutation({
    mutationFn: () => logisticsApi.pool(),
    onError: (exception) => setError(describeError(exception)),
    onSuccess: () => setError(null),
  });

  const routes: RouteAlternative[] = plan.data ? Object.values(plan.data.routes) : [];
  const best = routes.reduce<RouteAlternative | null>(
    (lowest, route) =>
      lowest === null || route.emissions_kgco2e < lowest.emissions_kgco2e ? route : lowest,
    null,
  );

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ACT / GREEN LOGISTICS & ROUTE PLANNER"
        title="Decarbonize your transport corridors."
        description="Compare multi-modal routes, pool truck capacity with regional manufacturers, and eliminate empty backhaul miles."
        meta={workspace.plantName}
      />

      {error ? <Note tone="warning">{error}</Note> : null}

      <SectionHeading
        index="FR-41 / ROUTE PLANNER"
        title="Pick a corridor"
        description="Illustrative industrial corridors. The figures beside each route are service output."
      />
      <GlassPanel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {CORRIDORS.map((item) => (
            <Chip
              key={item.id}
              label={item.name.split('(')[0].trim()}
              selected={corridorId === item.id}
              onPress={() => setCorridorId(item.id)}
            />
          ))}
        </View>
        <View style={{ marginTop: space.md }}>
          <DetailRows
            rows={[
              ['Origin', corridor.origin],
              ['Destination', corridor.destination],
              ['Typical commodity', corridor.typicalCommodity],
              ['Documented distance', `${number(corridor.distanceKm)} km`],
            ]}
          />
        </View>
        <View style={{ marginTop: space.md }}>
          <Field
            label="Payload"
            value={payload}
            onChangeText={setPayload}
            keyboardType="decimal-pad"
            suffix="tonnes"
          />
        </View>
        <Button
          title="Plan this corridor"
          onPress={() => plan.mutate()}
          loading={plan.isPending}
        />
      </GlassPanel>

      {plan.isPending ? <Loading label="Planning routes" /> : null}

      {routes.length ? (
        <>
          <SectionHeading
            title="Route alternatives"
            description="Same corridor, four operating priorities. Carbon is the fourth column, not an afterthought."
          />
          {routes
            .slice()
            .sort((a, b) => a.emissions_kgco2e - b.emissions_kgco2e)
            .map((route) => (
              <GlassPanel
                key={route.preset}
                tone={route.preset === best?.preset ? 'positive' : 'default'}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                    {humanise(route.preset)}
                  </Text>
                  <Badge tone={PRESET_TONE[route.preset] ?? 'neutral'}>
                    {route.preset === best?.preset ? 'LOWEST CARBON' : humanise(route.preset)}
                  </Badge>
                </View>
                <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
                  {route.description}
                </Text>
                <View style={{ marginTop: space.md }}>
                  <DetailRows
                    rows={[
                      ['Vehicle', route.vehicle],
                      ['Distance', `${number(route.distance_km)} km`],
                      ['Transit', `${number(route.transit_hours, 1)} hours`],
                      ['Freight cost', money(route.cost_inr)],
                      ['Emissions', `${number(route.emissions_kgco2e)} kgCO2e`],
                      [
                        'Carbon reduction',
                        route.carbon_reduction_pct === null ||
                        route.carbon_reduction_pct === undefined
                          ? 'Baseline'
                          : `${number(route.carbon_reduction_pct, 1)}%`,
                      ],
                    ]}
                  />
                </View>
                {factoryId ? (
                  <Button
                    title="Register a shipment on this route"
                    variant="secondary"
                    loading={book.isPending && book.variables === route.preset}
                    onPress={() => book.mutate(route.preset)}
                    style={{ marginTop: space.md }}
                  />
                ) : null}
              </GlassPanel>
            ))}
          {best ? (
            <Metrics
              items={[
                { label: 'Lowest-carbon option', value: humanise(best.preset) },
                {
                  label: 'Emissions on that route',
                  value: number(best.emissions_kgco2e),
                  unit: 'kgCO2e',
                  positive: true,
                },
                { label: 'Freight cost', value: money(best.cost_inr) },
                { label: 'Transit', value: `${number(best.transit_hours, 1)} h` },
              ]}
            />
          ) : null}
        </>
      ) : null}

      <SectionHeading
        index="FR-42 / TRUCK POOLING"
        title="Share the truck, split the carbon"
        description="Capacity-constrained nearest-neighbour pooling across pending shipments."
      />
      {!factoryId ? (
        <GlassPanel tone="warning">
          <Badge tone="high">SIGN IN REQUIRED</Badge>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
            Pooling reads the pending shipments your organisation can see, so it needs a signed-in
            plant. Route planning above works either way.
          </Text>
        </GlassPanel>
      ) : (
        <>
          <GlassPanel>
            <Text style={{ ...typeScale.caption, color: colour.muted }}>
              {shipments.data?.length
                ? `${number(shipments.data.length)} shipment(s) registered.`
                : 'No shipments registered yet. Plan a corridor above and register one.'}
            </Text>
            <Button
              title="Run the pooling optimiser"
              variant="secondary"
              onPress={() => pool.mutate()}
              loading={pool.isPending}
              style={{ marginTop: space.md }}
            />
          </GlassPanel>

          {pool.data ? (
            <GlassPanel tone={pool.data.status === 'INSUFFICIENT_SHIPMENTS' ? 'warning' : 'positive'}>
              <Badge tone={pool.data.status === 'INSUFFICIENT_SHIPMENTS' ? 'high' : 'positive'}>
                {humanise(pool.data.status)}
              </Badge>
              <View style={{ marginTop: space.sm }}>
                <DetailRows
                  rows={[
                    ['Algorithm', pool.data.algorithm],
                    ['Shipments evaluated', number(pool.data.total_shipments_evaluated)],
                    ['Trucks before', number(pool.data.trucks_dispatched_before)],
                    ['Trucks after', number(pool.data.trucks_dispatched_after)],
                    ['Truck reduction', `${number(pool.data.truck_count_reduction_pct, 1)}%`],
                    ['Pooled runs', number(pool.data.pooled_runs.length)],
                  ]}
                />
              </View>
              {pool.data.status === 'INSUFFICIENT_SHIPMENTS' ? (
                <Note tone="warning">
                  Pooling needs at least two pending shipments before it can consolidate anything.
                </Note>
              ) : null}
            </GlassPanel>
          ) : null}

          {shipments.data?.length ? (
            <>
              <SectionHeading title="Registered shipments" />
              {shipments.data.map((shipment) => (
                <GlassPanel key={shipment.id} style={{ paddingVertical: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                      {shipment.origin_name} to {shipment.destination_name}
                    </Text>
                    <Badge tone={shipment.pooled_run_id ? 'positive' : 'neutral'}>
                      {humanise(shipment.status)}
                    </Badge>
                  </View>
                  <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                    {number(shipment.payload_tonnes, 1)} t · {shipment.cargo_type}
                    {shipment.selected_route_preset
                      ? ` · ${humanise(shipment.selected_route_preset)}`
                      : ''}
                  </Text>
                  {shipment.emissions_kgco2e === null ||
                  shipment.emissions_kgco2e === undefined ? null : (
                    <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}>
                      {number(shipment.emissions_kgco2e)} kgCO2e ·{' '}
                      {number(shipment.distance_km)} km · {money(shipment.cost_inr)}
                    </Text>
                  )}
                </GlassPanel>
              ))}
            </>
          ) : null}
        </>
      )}

      <SectionHeading
        index="FR-43 / BACKHAUL"
        title="Empty running is paid-for carbon"
        description="A truck that returns empty charges you for a trip that moved nothing."
      />
      <GlassPanel tone="inset">
        <View
          style={{
            padding: space.md,
            borderRadius: radius.control,
            backgroundColor: colour.surfaceInset,
          }}
        >
          <Text style={{ ...typeScale.caption, color: colour.muted }}>
            Register the return leg as its own shipment and the pooling optimiser will match it
            against inbound capacity on the same corridor. Backhaul matching is part of the same
            service as pooling above.
          </Text>
        </View>
      </GlassPanel>

      {!routes.length && !plan.isPending ? (
        <EmptyState
          title="No route planned yet"
          body="Choose a corridor and payload, then plan it. Four operating priorities come back with their own carbon figure."
        />
      ) : null}

      <Note>
        Route distances, transit times and freight costs are service estimates for screening. Confirm
        with your transporter before committing to a mode shift.
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
