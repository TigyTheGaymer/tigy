import type { Person, SocialLink } from '@tigy/models';
import type { PersonEdits } from '../people-api';

export interface PersonModel {
  name: string;
  links: SocialLink[];
}

export function toPersonModel(person: Person): PersonModel {
  return {
    name: person.name,
    links: person.links.map((link) => ({ ...link })),
  };
}

export function normalisePerson(model: PersonModel): PersonModel {
  return {
    name: model.name.trim(),
    links: model.links.map((link) => ({
      network: link.network.trim(),
      handle: link.handle.trim(),
      url: link.url.trim(),
    })),
  };
}

const sameLinks = (a: SocialLink[], b: SocialLink[]) =>
  a.length === b.length &&
  a.every(
    (link, i) =>
      link.network === b[i].network &&
      link.handle === b[i].handle &&
      link.url === b[i].url,
  );

/** The name and links when they differ from what was loaded; the avatar is saved on its own. */
export function changedPersonEdits(
  model: PersonModel,
  loaded: PersonModel,
): PersonEdits {
  const now = normalisePerson(model);
  const edits: PersonEdits = {};
  if (now.name !== loaded.name) edits.name = now.name;
  if (!sameLinks(now.links, loaded.links)) edits.links = now.links;
  return edits;
}

export const isHttps = (url: string) => /^https:\/\/\S+$/i.test(url.trim());
