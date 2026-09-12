/**
 * Circular network. The web app's `/circular-network` (PRD FR-44, FR-45).
 *
 * Industrial symbiosis: one plant's by-product is another's feedstock, and an
 * idle furnace over a weekend is capacity someone else is buying new. The
 * cluster listings are the same illustrative set the web shows; published
 * supplier listings come from the marketplace service and are labelled
 * separately so the two are never confused.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { marketplace as marketplaceApi } from '../api/endpoints';
import {
  Badge,
  DetailRows,
  GlassPanel,
  Metrics,
  ModuleScreen,
  PageHeading,
  SectionHeading,
  Segmented,
  TrustBar,
} from '../components/layout';
import { EmptyState, Loading, Note } from '../components/ui';
import { CAPACITY_LISTINGS, SYMBIOSIS_LISTINGS } from '../data/network';
import { label as humanise, money, number } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RootStackParams } from '../navigation/types';

type Tab = 'byproducts' | 'capacity' | 'listings';

const CATEGORY_LABEL: Record<string, string> = {
  ash_slag: 'Ash and slag',
  solvent: 'Recovered solvent',
  textile: 'Textile by-product',
  biomass: 'Biomass',
};

export default function CircularNetworkScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const factoryId = workspace.source === 'live' ? workspace.factoryId : null;
  const [tab, setTab] = useState<Tab>('byproducts');

  const listings = useQuery({
    queryKey: ['materials'],
    queryFn: () => marketplaceApi.materials(),
    enabled: Boolean(factoryId),
  });

  const avoided = SYMBIOSIS_LISTINGS.reduce(
    (sum, item) => sum + item.annualQtyT * item.avoidedEmissionsPerT,
    0,
  );

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ACT / CIRCULAR NETWORK"
        title="Turn waste into feedstock and share idle capacity."
        description="Discover regional industrial symbiosis pairings, monetize underutilized machinery, and source circular secondary by-products."
        meta={workspace.plantName}
      />

      <Metrics
        items={[
          { label: 'By-product streams listed', value: number(SYMBIOSIS_LISTINGS.length) },
          { label: 'Shared assets listed', value: number(CAPACITY_LISTINGS.length) },
          {
            label: 'Avoided if fully offtaken',
            value: number(avoided),
            unit: 'tCO2e',
            positive: true,
          },
          {
            label: 'Published supplier listings',
            value: factoryId ? number(listings.data?.length ?? 0) : 'Sign in',
          },
        ]}
      />

      <View style={{ marginBottom: space.md }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'byproducts', label: 'By-products' },
            { value: 'capacity', label: 'Capacity' },
            { value: 'listings', label: 'Live listings' },
          ]}
        />
      </View>

      {tab === 'byproducts' ? (
        <>
          <SectionHeading
            index="FR-44 / SYMBIOSIS"
            title="Somebody's waste is your raw material"
            description="Specification, quantity and avoided carbon per tonne, so the swap can be judged before a call."
          />
          {SYMBIOSIS_LISTINGS.map((item) => (
            <GlassPanel key={item.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                  {item.material}
                </Text>
                <Badge tone="accent">{CATEGORY_LABEL[item.category] ?? item.category}</Badge>
              </View>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                {item.generator} · {item.cluster}
              </Text>
              <View style={{ marginTop: space.md }}>
                <DetailRows
                  rows={[
                    ['Available annually', `${number(item.annualQtyT)} t`],
                    ['Indicative price', `${money(item.pricePerTInr)} / t`],
                    ['Avoided emissions', `${number(item.avoidedEmissionsPerT, 2)} tCO2e / t`],
                    [
                      'Avoided at full offtake',
                      `${number(item.annualQtyT * item.avoidedEmissionsPerT)} tCO2e`,
                    ],
                    ['Certification', item.certifications],
                  ]}
                />
              </View>
              <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: space.sm }}>
                Specification: {item.specs}
              </Text>
              <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
                Suitable for: {item.suitableApplications.join('; ')}
              </Text>
            </GlassPanel>
          ))}
          <Note>
            Cluster listings are illustrative and are not offers. Confirm specification, logistics
            and consent for use before substituting any feedstock.
          </Note>
        </>
      ) : null}

      {tab === 'capacity' ? (
        <>
          <SectionHeading
            index="FR-45 / SHARED CAPACITY"
            title="An idle furnace is stranded capital"
            description="Spare thermal and machining capacity offered inside a cluster, with its window and rate."
          />
          {CAPACITY_LISTINGS.map((item) => (
            <GlassPanel key={item.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                  {item.title}
                </Text>
                <Badge tone="neutral">{humanise(item.assetType)}</Badge>
              </View>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                {item.ownerFactory} · {item.cluster}
              </Text>
              <View style={{ marginTop: space.md }}>
                <DetailRows
                  rows={[
                    ['Available capacity', item.availableCapacity],
                    ['Window', item.availabilityWindow],
                    ['Rate', item.rate],
                  ]}
                />
              </View>
              <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: space.sm }}>
                {item.specifications}
              </Text>
            </GlassPanel>
          ))}
          <Note>
            Shared-capacity arrangements carry their own safety, insurance and statutory
            obligations. PRANGARA lists them; it does not broker them.
          </Note>
        </>
      ) : null}

      {tab === 'listings' ? (
        factoryId ? (
          <>
            <SectionHeading
              title="Published supplier listings"
              description="Real listings from the marketplace service, with the source of every carbon figure."
            />
            {listings.isLoading ? <Loading label="Loading listings" /> : null}
            {listings.data?.length ? (
              listings.data.map((listing) => (
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
                          'Stock',
                          listing.stock_t === null || listing.stock_t === undefined
                            ? 'Not supplied'
                            : `${number(listing.stock_t)} t`,
                        ],
                      ]}
                    />
                  </View>
                  {listing.embodied_source ? (
                    <Text
                      style={{ ...typeScale.caption, color: colour.muted, marginTop: space.sm }}
                    >
                      Carbon source: {listing.embodied_source}
                    </Text>
                  ) : null}
                </GlassPanel>
              ))
            ) : listings.isLoading ? null : (
              <EmptyState
                title="No published listings"
                body="No supplier has published a material listing your organisation can see."
              />
            )}
          </>
        ) : (
          <GlassPanel tone="warning">
            <Badge tone="high">SIGN IN REQUIRED</Badge>
            <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
              Live supplier listings come from the marketplace service. The cluster listings in the
              other two tabs work offline.
            </Text>
          </GlassPanel>
        )
      ) : null}

      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
