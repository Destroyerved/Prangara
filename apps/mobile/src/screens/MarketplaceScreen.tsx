/**
 * Marketplace and RFQs. The web app's `/marketplace`.
 *
 * Find implementation support and compare cost with carbon: matched providers
 * for a chosen intervention, a quote request that shares only the limited
 * project context the backend allows, and a comparison that reprices the
 * engine's estimate against what suppliers actually quoted.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { marketplace as marketplaceApi } from '../api/endpoints';
import {
  Badge,
  DetailRows,
  GlassPanel,
  ModuleScreen,
  PageHeading,
  SectionHeading,
  Segmented,
  TrustBar,
} from '../components/layout';
import { Button, Chip, EmptyState, Field, Loading, Note } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { label as humanise, money, number, payback } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RFQ } from '../api/types';
import type { RootStackParams } from '../navigation/types';

type Tab = 'providers' | 'materials' | 'requests';

export default function MarketplaceScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'Marketplace'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const factoryId = workspace.source === 'live' ? workspace.factoryId : null;

  const result = workspace.assessment;
  const interventions = result?.recommendations.recommendations ?? [];
  const [tab, setTab] = useState<Tab>('providers');
  const [interventionId, setInterventionId] = useState<string | null>(
    route.params?.interventionId ?? interventions[0]?.id ?? null,
  );
  const [invited, setInvited] = useState<string[]>([]);
  const [rfqTitle, setRfqTitle] = useState(route.params?.title ?? '');
  const [scope, setScope] = useState('Supply, install and commission. Include a commissioning report.');
  const [openRfq, setOpenRfq] = useState<RFQ | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: () => marketplaceApi.providers(),
    enabled: Boolean(factoryId),
  });

  const matches = useQuery({
    queryKey: ['provider-match', factoryId, interventionId],
    queryFn: () => marketplaceApi.match(factoryId as string, interventionId as string),
    enabled: Boolean(factoryId && interventionId),
  });

  const materials = useQuery({
    queryKey: ['materials'],
    queryFn: () => marketplaceApi.materials(),
    enabled: Boolean(factoryId),
  });

  const rfqs = useQuery({
    queryKey: ['rfqs', factoryId],
    queryFn: () => marketplaceApi.rfqs(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const comparison = useQuery({
    queryKey: ['rfq-compare', openRfq?.id],
    queryFn: () => marketplaceApi.compare(openRfq?.id as string),
    enabled: Boolean(openRfq?.id),
  });

  const createRfq = useMutation({
    mutationFn: () => {
      if (!factoryId || !interventionId) throw new Error('Choose an intervention first.');
      if (!invited.length) throw new Error('Select at least one provider to invite.');
      const chosen = interventions.find((item) => item.id === interventionId);
      return marketplaceApi.createRfq({
        factory_id: factoryId,
        intervention_id: interventionId,
        title: rfqTitle || `${chosen?.name ?? interventionId} - ${workspace.plantName}`,
        scope_of_work: scope,
        provider_ids: invited,
      });
    },
    onSuccess: (created) => {
      setError(null);
      setOpenRfq(created);
      setTab('requests');
      queryClient.invalidateQueries({ queryKey: ['rfqs', factoryId] });
    },
    onError: (exception) => setError(describeError(exception)),
  });

  const accept = useMutation({
    mutationFn: (quoteId: string) => marketplaceApi.acceptQuote(quoteId),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['rfq-compare', openRfq?.id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs', factoryId] });
    },
    onError: (exception) => setError(describeError(exception)),
  });

  if (!factoryId) {
    return (
      <ModuleScreen>
        <PageHeading
          eyebrow="WORKSPACE / MARKETPLACE"
          title="Make the next move."
          description="Find implementation support and compare cost with carbon."
        />
        <GlassPanel tone="warning">
          <Badge tone="high">SIGN IN REQUIRED</Badge>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
            Provider matching and quote requests write to your organisation's records, so this
            module needs a signed-in plant.
          </Text>
          <Button
            title="Go to sign in"
            variant="secondary"
            onPress={() => navigation.navigate('Tabs', { screen: 'Account' })}
            style={{ marginTop: space.md }}
          />
        </GlassPanel>
      </ModuleScreen>
    );
  }

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="WORKSPACE / MARKETPLACE"
        title="Make the next move."
        description="Find implementation support and compare cost with carbon."
        meta={workspace.plantName}
      />

      {error ? <Note tone="warning">{error}</Note> : null}

      <GlassPanel tone="inset">
        <Text style={{ ...typeScale.micro, color: colour.subtle }}>PROJECT CONTEXT</Text>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
          Pick the intervention you want help with. Only the limited context the backend shares
          reaches a provider.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md }}>
          {interventions.slice(0, 8).map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              selected={interventionId === item.id}
              onPress={() => setInterventionId(item.id)}
            />
          ))}
        </View>
      </GlassPanel>

      <View style={{ marginBottom: space.md }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'providers', label: 'Providers' },
            { value: 'materials', label: 'Materials' },
            { value: 'requests', label: 'Requests' },
          ]}
        />
      </View>

      {tab === 'providers' ? (
        <>
          <SectionHeading
            title="Matches for this intervention"
            description="Scored on category fit, service area and verification."
          />
          {matches.isLoading ? <Loading label="Matching providers" /> : null}
          {matches.data?.length ? (
            matches.data.map((match) => (
              <GlassPanel key={match.provider.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                    {match.provider.name}
                  </Text>
                  <Badge
                    tone={match.provider.verification_status === 'verified' ? 'positive' : 'neutral'}
                  >
                    {humanise(match.provider.verification_status)}
                  </Badge>
                </View>
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                  {humanise(match.provider.provider_type)}
                  {match.provider.state ? ` · ${match.provider.state}` : ''}
                  {match.provider.is_demo_seed ? ' · demo seed listing' : ''}
                </Text>
                <View style={{ marginTop: space.md }}>
                  <DetailRows
                    rows={[
                      ['Match score', number(match.score, 3)],
                      [
                        'Distance',
                        match.distance_km === null || match.distance_km === undefined
                          ? 'Not supplied'
                          : `${number(match.distance_km)} km`,
                      ],
                      [
                        'Indicative price',
                        match.indicative_price_inr === null ||
                        match.indicative_price_inr === undefined
                          ? 'Not supplied'
                          : money(match.indicative_price_inr),
                      ],
                      [
                        'Rating',
                        match.provider.rating === null || match.provider.rating === undefined
                          ? 'Not rated'
                          : `${number(match.provider.rating, 1)} of 5 (${number(
                              match.provider.rating_count,
                            )})`,
                      ],
                      [
                        'Typical lead time',
                        match.provider.typical_lead_time_days
                          ? `${number(match.provider.typical_lead_time_days)} days`
                          : 'Not supplied',
                      ],
                    ]}
                  />
                </View>
                {match.reasons?.length ? (
                  <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: space.sm }}>
                    Why matched: {match.reasons.join('; ')}
                  </Text>
                ) : null}
                <Button
                  title={invited.includes(match.provider.id) ? 'Invited' : 'Invite to quote'}
                  variant={invited.includes(match.provider.id) ? 'ghost' : 'secondary'}
                  onPress={() =>
                    setInvited((current) =>
                      current.includes(match.provider.id)
                        ? current.filter((id) => id !== match.provider.id)
                        : [...current, match.provider.id],
                    )
                  }
                  style={{ marginTop: space.md }}
                />
              </GlassPanel>
            ))
          ) : matches.isLoading ? null : (
            <EmptyState
              title="No matching providers returned"
              body="Nothing in the directory covers this intervention and service area yet."
            />
          )}

          <SectionHeading
            title="Request implementation quotes"
            description="Invite the providers above, then send one request."
          />
          <GlassPanel>
            <Field
              label="Request title"
              value={rfqTitle}
              onChangeText={setRfqTitle}
              placeholder={interventions.find((i) => i.id === interventionId)?.name ?? 'Title'}
            />
            <Field label="Scope of work" value={scope} onChangeText={setScope} multiline />
            <Text style={{ ...typeScale.caption, color: colour.subtle, marginBottom: space.sm }}>
              {invited.length
                ? `${invited.length} provider(s) invited`
                : 'No providers invited yet'}
            </Text>
            <Button
              title="Create request and invite"
              onPress={() => createRfq.mutate()}
              loading={createRfq.isPending}
              disabled={!invited.length}
            />
          </GlassPanel>

          <SectionHeading title="Provider directory" />
          {providers.data?.slice(0, 10).map((provider) => (
            <GlassPanel key={provider.id} style={{ paddingVertical: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                  {provider.name}
                </Text>
                <Badge tone={provider.verification_status === 'verified' ? 'positive' : 'neutral'}>
                  {humanise(provider.verification_status)}
                </Badge>
              </View>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
                {humanise(provider.provider_type)}
                {provider.state ? ` · ${provider.state}` : ''}
                {provider.certifications?.length
                  ? ` · ${provider.certifications.join(', ')}`
                  : ''}
              </Text>
            </GlassPanel>
          ))}
        </>
      ) : null}

      {tab === 'materials' ? (
        <>
          <SectionHeading
            title="Carbon-aware material sourcing"
            description="Embodied carbon is only shown where the listing supplied its source."
          />
          {materials.isLoading ? <Loading label="Loading listings" /> : null}
          {materials.data?.length ? (
            materials.data.map((listing) => (
              <GlassPanel key={listing.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                    {listing.name}
                  </Text>
                  {listing.is_demo_seed ? <Badge tone="neutral">DEMO SEED</Badge> : null}
                </View>
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                  {listing.provider_name ?? 'Unnamed supplier'}
                  {listing.state ? ` · ${listing.state}` : ''}
                </Text>
                <View style={{ marginTop: space.md }}>
                  <DetailRows
                    rows={[
                      ['Grade', listing.grade ?? 'Not supplied'],
                      [
                        'Recycled content',
                        listing.recycled_content_pct === null ||
                        listing.recycled_content_pct === undefined
                          ? 'Not supplied'
                          : `${number(listing.recycled_content_pct)}%`,
                      ],
                      [
                        'Embodied carbon',
                        listing.embodied_tco2e_per_t === null ||
                        listing.embodied_tco2e_per_t === undefined
                          ? 'Not supplied'
                          : `${number(listing.embodied_tco2e_per_t, 3)} tCO2e/t`,
                      ],
                      [
                        'Price',
                        listing.price_inr_per_t === null || listing.price_inr_per_t === undefined
                          ? 'Not supplied'
                          : `${money(listing.price_inr_per_t)} / t`,
                      ],
                      [
                        'Minimum order',
                        listing.moq_t === null || listing.moq_t === undefined
                          ? 'Not supplied'
                          : `${number(listing.moq_t)} t`,
                      ],
                      [
                        'Stock',
                        listing.stock_t === null || listing.stock_t === undefined
                          ? 'Not supplied'
                          : `${number(listing.stock_t)} t`,
                      ],
                    ]}
                  />
                </View>
                {listing.embodied_source ? (
                  <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: space.sm }}>
                    Carbon source: {listing.embodied_source}
                  </Text>
                ) : null}
              </GlassPanel>
            ))
          ) : materials.isLoading ? null : (
            <EmptyState
              title="No material listings"
              body="No supplier has published a listing your organisation can see."
            />
          )}
          <Note>
            Check the specification, source and certification before procurement. Transport
            emissions and delivered cost are not included unless the listing supplied them.
          </Note>
        </>
      ) : null}

      {tab === 'requests' ? (
        <>
          <SectionHeading
            title="Your quote requests"
            description="Tap one to compare what came back against the engine's estimate."
          />
          {rfqs.isLoading ? <Loading label="Loading requests" /> : null}
          {rfqs.data?.length ? (
            rfqs.data.map((rfq) => (
              <GlassPanel
                key={rfq.id}
                onPress={() => setOpenRfq(openRfq?.id === rfq.id ? null : rfq)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                    {rfq.title}
                  </Text>
                  <Badge tone={rfq.accepted_quote_id ? 'positive' : 'accent'}>
                    {humanise(rfq.status)}
                  </Badge>
                </View>
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                  {number(rfq.quote_count)} quote(s)
                  {rfq.needed_by ? ` · needed by ${rfq.needed_by}` : ''}
                </Text>
              </GlassPanel>
            ))
          ) : rfqs.isLoading ? null : (
            <EmptyState
              title="No quote requests yet"
              body="Invite providers from the Providers tab and create your first request."
            />
          )}

          {openRfq ? (
            <>
              <SectionHeading
                index="COMPARISON"
                title={openRfq.title}
                description="Quoted price repriced through the same payback and cost-per-tonne maths."
              />
              {comparison.isLoading ? <Loading label="Comparing quotes" /> : null}
              {comparison.data ? (
                <>
                  <GlassPanel tone="inset">
                    <Text style={{ ...typeScale.micro, color: colour.subtle }}>
                      ENGINE ESTIMATE
                    </Text>
                    <View style={{ marginTop: 6 }}>
                      <DetailRows
                        rows={Object.entries(comparison.data.engine_estimate ?? {}).map(
                          ([key, value]) => [humanise(key), String(value)],
                        )}
                      />
                    </View>
                  </GlassPanel>
                  {comparison.data.quotes.length ? (
                    comparison.data.quotes.map((quote) => (
                      <GlassPanel key={quote.id}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                            {quote.provider_name ?? quote.provider_id}
                          </Text>
                          <Badge tone={quote.status === 'ACCEPTED' ? 'positive' : 'neutral'}>
                            {humanise(quote.status)}
                          </Badge>
                        </View>
                        <View style={{ marginTop: space.md }}>
                          <DetailRows
                            rows={[
                              ['Quoted price', money(quote.price_inr)],
                              [
                                'Installation',
                                quote.installation_included
                                  ? 'Included'
                                  : quote.installation_inr
                                    ? money(quote.installation_inr)
                                    : 'Not included',
                              ],
                              [
                                'Annual opex change',
                                quote.annual_opex_delta_inr === null ||
                                quote.annual_opex_delta_inr === undefined
                                  ? 'Not supplied'
                                  : `${money(quote.annual_opex_delta_inr)} / yr`,
                              ],
                              [
                                'Warranty',
                                quote.warranty_months
                                  ? `${number(quote.warranty_months)} months`
                                  : 'Not supplied',
                              ],
                              [
                                'Delivery',
                                quote.delivery_days
                                  ? `${number(quote.delivery_days)} days`
                                  : 'Not supplied',
                              ],
                              ['Revised payback', payback(quote.revised_payback_yrs ?? null)],
                              [
                                'Revised cost of abatement',
                                quote.revised_lcoa_inr_per_tco2e === null ||
                                quote.revised_lcoa_inr_per_tco2e === undefined
                                  ? 'Not supplied'
                                  : `${money(quote.revised_lcoa_inr_per_tco2e)} / tCO2e`,
                              ],
                            ]}
                          />
                        </View>
                        {quote.notes ? (
                          <Text
                            style={{ ...typeScale.caption, color: colour.muted, marginTop: space.sm }}
                          >
                            {quote.notes}
                          </Text>
                        ) : null}
                        {can('marketplace:write') &&
                        !comparison.data.rfq.accepted_quote_id &&
                        ['SUBMITTED', 'SHORTLISTED'].includes(quote.status) ? (
                          <Button
                            title={`Accept ${quote.provider_name ?? 'this quote'}`}
                            variant="secondary"
                            loading={accept.isPending && accept.variables === quote.id}
                            onPress={() => accept.mutate(quote.id)}
                            style={{ marginTop: space.md }}
                          />
                        ) : null}
                      </GlassPanel>
                    ))
                  ) : (
                    <EmptyState
                      title="No quotes yet"
                      body="Invited providers have not responded to this request."
                    />
                  )}
                  <Note>{comparison.data.note}</Note>
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <Note>
        Verification, ratings and service coverage are reported by the service. Demo seed listings
        are identified as such.
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
