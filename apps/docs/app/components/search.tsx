import { useStaticSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog as FumadocsSearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import type { ReactElement } from 'react';

/** Static (prerendered) search index: no server needed. */
export function SearchDialog(props: SharedProps): ReactElement {
  const { locale } = useI18n();
  const search = useStaticSearch(locale === undefined ? {} : { locale });

  return (
    <FumadocsSearchDialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </FumadocsSearchDialog>
  );
}
