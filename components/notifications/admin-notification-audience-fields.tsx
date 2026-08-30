"use client";

import {
  useState,
} from "react";

type Option = {
  id: string;
  name: string;
};

type CharacterOption = {
  id: string;
  display_name: string;
};

type Props = {
  initialType: string;
  initialTargetId: string | null;
  characters: CharacterOption[];
  ancestries: Option[];
  associations: Option[];
  orders: Option[];
};

export function AdminNotificationAudienceFields({
  initialType,
  initialTargetId,
  characters,
  ancestries,
  associations,
  orders,
}: Props) {
  const [targetType, setTargetType] =
    useState(initialType);

  const [characterId, setCharacterId] =
    useState(
      initialType === "character"
        ? initialTargetId ?? ""
        : "",
    );

  const [ancestryId, setAncestryId] =
    useState(
      initialType === "ancestry"
        ? initialTargetId ?? ""
        : "",
    );

  const [
    associationId,
    setAssociationId,
  ] = useState(
    initialType === "association"
      ? initialTargetId ?? ""
      : "",
  );

  const [orderId, setOrderId] =
    useState(
      initialType === "order"
        ? initialTargetId ?? ""
        : "",
    );

  const [userId, setUserId] =
    useState(
      initialType === "user"
        ? initialTargetId ?? ""
        : "",
    );

  function changeAudience(
    next: string,
  ) {
    setTargetType(next);

    if (next !== "character") {
      setCharacterId("");
    }

    if (next !== "ancestry") {
      setAncestryId("");
    }

    if (next !== "association") {
      setAssociationId("");
    }

    if (next !== "order") {
      setOrderId("");
    }

    if (next !== "user") {
      setUserId("");
    }
  }

  const selectClass =
    "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label>
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Audience
        </span>

        <select
          name="targetType"
          value={targetType}
          onChange={(event) =>
            changeAudience(
              event.target.value,
            )
          }
          className={selectClass}
        >
          <option value="global">
            Everyone
          </option>

          <option value="staff">
            Staff only
          </option>

          <option value="character">
            Specific character
          </option>

          <option value="ancestry">
            Ancestry
          </option>

          <option value="association">
            Association
          </option>

          <option value="order">
            Order
          </option>

          <option value="user">
            Specific user ID
          </option>
        </select>
      </label>

      <label>
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Character target
        </span>

        <select
          name="characterTargetId"
          value={characterId}
          disabled={
            targetType !==
            "character"
          }
          onChange={(event) =>
            setCharacterId(
              event.target.value,
            )
          }
          className={selectClass}
        >
          <option value="">
            None
          </option>

          {characters.map(
            (character) => (
              <option
                key={character.id}
                value={character.id}
              >
                {
                  character.display_name
                }
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Ancestry target
        </span>

        <select
          name="ancestryTargetId"
          value={ancestryId}
          disabled={
            targetType !==
            "ancestry"
          }
          onChange={(event) =>
            setAncestryId(
              event.target.value,
            )
          }
          className={selectClass}
        >
          <option value="">
            None
          </option>

          {ancestries.map(
            (ancestry) => (
              <option
                key={ancestry.id}
                value={ancestry.id}
              >
                {ancestry.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Association target
        </span>

        <select
          name="associationTargetId"
          value={associationId}
          disabled={
            targetType !==
            "association"
          }
          onChange={(event) =>
            setAssociationId(
              event.target.value,
            )
          }
          className={selectClass}
        >
          <option value="">
            None
          </option>

          {associations.map(
            (association) => (
              <option
                key={association.id}
                value={
                  association.id
                }
              >
                {association.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Order target
        </span>

        <select
          name="orderTargetId"
          value={orderId}
          disabled={
            targetType !== "order"
          }
          onChange={(event) =>
            setOrderId(
              event.target.value,
            )
          }
          className={selectClass}
        >
          <option value="">
            None
          </option>

          {orders.map((order) => (
            <option
              key={order.id}
              value={order.id}
            >
              {order.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          User UUID
        </span>

        <input
          name="userTargetId"
          value={userId}
          disabled={
            targetType !== "user"
          }
          onChange={(event) =>
            setUserId(
              event.target.value,
            )
          }
          placeholder={
            targetType === "user"
              ? "User UUID"
              : "None"
          }
          className={selectClass}
        />
      </label>
    </div>
  );
}
