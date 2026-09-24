"use client";

export const STAGE2_TOURS = {
  "sepulchria-map": {
    "key": "sepulchria-map",
    "label": "Sepulchria Map",
    "steps": [
      {
        "selector": ".components_portal_interactive_world_map_section_section",
        "title": "The Map of Sepulchria",
        "body": "This is the city map. Sepulchria is divided into districts, and each district contains its own Locations."
      },
      {
        "selector": "svg[aria-label=\"Sepulchria districts\"]",
        "title": "Choose a District",
        "body": "Move across the districts to identify them. Select a district to open it and see the Locations currently available there."
      },
      {
        "selector": ".components_portal_interactive_world_map_div_container_3",
        "title": "Explore the City",
        "body": "The map reacts as you explore it. District information appears as you move across the city, and selecting one takes you deeper into Sepulchria."
      },
      {
        "selector": ".components_portal_interactive_world_map_button_return_aureth",
        "title": "Return to Aureth",
        "body": "Use this control whenever you want to leave the city map and return to the wider map of Aureth."
      }
    ]
  },
  "area": {
    "key": "area",
    "label": "District",
    "steps": [
      {
        "selector": ".areas_slug_page_section_section",
        "title": "A District of Sepulchria",
        "body": "This page introduces the district you selected, including its imagery and description."
      },
      {
        "selector": ".areas_slug_page_section_section_2",
        "title": "Available Locations",
        "body": "This section contains the Locations you can currently enter in this district."
      },
      {
        "selector": ".areas_slug_page_article_article",
        "title": "Location Cards",
        "body": "Each card describes a Location. Some places may have special access rules or features that become available only after you enter."
      },
      {
        "selector": ".areas_slug_page_button_enter",
        "title": "Enter a Location",
        "body": "Press Enter to move your character into that Location and open the live play screen."
      }
    ]
  },
  "characters-directory": {
    "key": "characters-directory",
    "label": "Sepulchria's People",
    "steps": [
      {
        "selector": ".components_characters_character_directory_div_container",
        "title": "Sepulchria's People",
        "body": "This directory contains the approved player characters who inhabit Sepulchria."
      },
      {
        "selector": "[data-character-directory-filters]",
        "title": "Find Someone",
        "body": "Search by name or use the Ancestry, Association, current Location and presence filters to narrow the directory."
      },
      {
        "selector": ".components_characters_character_directory_section_section_2",
        "title": "Character Cards",
        "body": "Open a character to read their public sheet and use the interaction options available to you."
      }
    ]
  },
  "store": {
    "key": "store",
    "label": "Sepulchria's Store",
    "steps": [
      {
        "selector": "[data-store-page]",
        "title": "Sepulchria's Store",
        "body": "The Store contains optional Portal Skins, cosmetics, music, feature unlocks and bundles."
      },
      {
        "selector": ".store_page_header_header",
        "title": "Browse and Filter",
        "body": "Use the Store filters to narrow the catalogue. Product categories can include skins, cosmetics, music and feature unlocks."
      },
      {
        "selector": ".store_page_div_container_8",
        "title": "Your Store Area",
        "body": "Your account panels, featured products and the available catalogue live in this scrollable area."
      },
      {
        "selector": "[data-store-product='true'], .store_page_article_article",
        "title": "Products and Ownership",
        "body": "Product cards show what an item or bundle contains, whether you already own its grants, and which purchase options are available."
      }
    ]
  },
  "weather": {
    "key": "weather",
    "label": "Weather & Calendar",
    "steps": [
      {
        "selector": ".components_world_world_indicator_section_dialog",
        "title": "Weather & Calendar",
        "body": "This window combines Aureth's current date and time, the playable calendar, current weather, lunar phase and scheduled calendar events."
      },
      {
        "selector": ".components_world_world_indicator_h2_heading",
        "title": "Aureth Date and Time",
        "body": "The heading shows the current in-world date and time. Hover the date to see its real-world date equivalent."
      },
      {
        "selector": ".components_world_world_indicator_div_container_2",
        "title": "Move Through the Calendar",
        "body": "Use « and » to move by year and ‹ and › to move by month. Browsing the calendar never changes the actual current world date."
      },
      {
        "selector": ".components_world_world_indicator_button_today",
        "title": "Return to the Current Month",
        "body": "Current month takes you straight back to Aureth's current month after you have browsed elsewhere."
      },
      {
        "selector": ".components_world_world_indicator_div_container_7",
        "title": "Calendar Days",
        "body": "Every date shows its Aureth day number and lunar phase. The outlined current date is today in Aureth."
      },
      {
        "selector": ".sep-calendar-event-day",
        "title": "Days With Events",
        "body": "A date with scheduled activity shows an event counter and becomes clickable. Select one of these dates to open the events scheduled for that day."
      },
      {
        "selector": ".components_world_world_indicator_div_container_10",
        "title": "Events on This Day",
        "body": "The tutorial opens the first event-day visible in the current month. This panel then shows the selected date and the events scheduled for it. Selecting another marked day replaces this list with that day's events.",
        "prepare": "open-calendar-event"
      },
      {
        "selector": ".components_world_world_indicator_div_container_19",
        "title": "Current Weather",
        "body": "This panel shows the live in-world weather, temperature and weather intensity. The compact header control reflects the same current conditions."
      },
      {
        "selector": ".components_world_world_indicator_div_container_21",
        "title": "Current Lunar Phase",
        "body": "The lunar panel shows the current phase, illumination percentage and day of the lunar cycle. The same moon cycle is represented on the calendar."
      }
    ]
  },
  "city-people": {
    "key": "city-people",
    "label": "People in Sepulchria",
    "steps": [
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_3",
        "title": "People in Sepulchria",
        "body": "This is the live city-presence window. The number in the header is the current number of active characters visible through the presence system."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_7",
        "title": "Search Active Characters",
        "body": "Search by character name, Ancestry, Order, Association, visible Location or presence status. The result counter updates immediately as you type."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_9",
        "title": "Live Presence Count",
        "body": "This line tells you how many characters are present or how many match the current search. The list updates as city presence changes."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_11",
        "title": "Presence Cards",
        "body": "The cards show the active characters that match your filters. Their public identity, status and visible Location information are drawn from the live presence system."
      },
      {
        "selector": ".components_portal_active_city_counter_article_article",
        "title": "Character Presence Details",
        "body": "A character card contains the public details available to you and can link into that character's public information. Private Location information remains hidden unless you are allowed to see it."
      }
    ]
  },
  "skins": {
    "key": "skins",
    "label": "Portal Skins",
    "steps": [
      {
        "selector": ".components_portal_portal_appearance_modal_section_dialog",
        "title": "Portal Appearance",
        "body": "Portal Skins change the portal's visual appearance without changing gameplay. This window shows every skin currently visible to your account."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_div_container_3",
        "title": "Your Selected Skin",
        "body": "This block shows the skin currently saved to your account and its real colour swatch."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_div_container_7",
        "title": "Available Skin Cards",
        "body": "Each card shows a skin's name, description, colour swatch and ownership state such as Current, Purchased, Granted or its purchase price."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_article_article",
        "title": "A Skin",
        "body": "A skin card previews that appearance using its actual portal colour variables, so you can compare it with the currently selected skin."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_div_container_13",
        "title": "Preview and Use Skin",
        "body": "Preview temporarily applies a skin so you can inspect it across the Portal. Use skin permanently selects an unlocked skin. While previewing, an End preview control appears above the cards so you can return to your saved skin without changing it."
      }
    ]
  },
  "notifications": {
    "key": "notifications",
    "label": "Notifications",
    "steps": [
      {
        "selector": ".components_notifications_notification_bell_div_container_4",
        "title": "Notifications",
        "body": "This panel collects active off-game notifications. The heading shows whether notifications are muted or how many active notices are currently loaded."
      },
      {
        "selector": ".components_notifications_notification_bell_button_action_2",
        "title": "Mute or Unmute Notifications",
        "body": "Mute stops notification delivery from interrupting you. While muted, new notices remain waiting and can be restored by pressing Unmute."
      },
      {
        "selector": ".components_notifications_notification_bell_button_action_3",
        "title": "Mark All Read",
        "body": "Mark all read clears the unread state from every currently unread notification at once. The button is disabled when there is nothing unread."
      },
      {
        "selector": ".components_notifications_notification_bell_input_field",
        "title": "Filter Notifications",
        "body": "Use the search field to filter the loaded notification list. The counter beneath it shows how many notices match the current filter."
      },
      {
        "selector": ".components_notifications_notification_bell_div_container_9",
        "title": "Notification Feed",
        "body": "Each notice shows its type, time, title, body and whether it is new. Opening or selecting a notification also marks that individual notice as read."
      },
      {
        "selector": "[data-sep-notification-open=\"true\"]",
        "title": "Open the Related Area",
        "body": "Notifications that point somewhere in the Portal include an Open action. It takes you to the relevant page or opens the appropriate Portal modal when that destination is modal-based."
      }
    ]
  },
  "private-messages": {
    "key": "private-messages",
    "label": "Private Messages",
    "steps": [
      {
        "selector": ".messages_components_messages_inbox_client_div_container, .messages_id_page_main_main",
        "title": "Private Correspondence",
        "body": "Private Messages are persistent off-game conversations between characters. They are separate from Location whispers and Instant Chat."
      },
      {
        "selector": ".messages_components_messages_inbox_client_header_header, .messages_id_page_main_main header",
        "title": "Inbox and Conversations",
        "body": "From the inbox you can begin a new conversation, switch between active and archived threads, or open an existing conversation."
      },
      {
        "selector": ".messages_components_messages_inbox_client_section_section, .messages_id_page_main_main",
        "title": "Find and Read Messages",
        "body": "The inbox can search conversation text. Inside a conversation, the message history remains available as a persistent correspondence record."
      },
      {
        "selector": "[data-message-conversation-row='true'], .messages_id_page_main_main form",
        "title": "Continue the Conversation",
        "body": "Open a conversation row to read it, then use the composer in the conversation view to reply."
      }
    ]
  },
  "messages-conversation": {
    "key": "messages-conversation",
    "label": "Message Conversation",
    "steps": [
      {
        "selector": ".messages_id_page_main_main, .messages_components_group_conversation_view_main_main",
        "title": "A Private Conversation",
        "body": "This is a persistent private-message conversation. It remains available in your Messages until you archive or delete it."
      },
      {
        "selector": ".messages_id_page_div_container_3, .messages_components_group_conversation_view_header_header",
        "title": "Conversation Details",
        "body": "The conversation header identifies who you are speaking with. From here you can also archive or delete the conversation when those actions are available."
      },
      {
        "selector": ".messages_id_components_conversationmessagelist_section_section",
        "title": "Search and Filter Messages",
        "body": "Use the controls above the history to search the conversation, filter On-game and Off-game messages, narrow by date, or manage selected messages."
      },
      {
        "selector": ".messages_id_components_conversationmessagelist_div_container_6",
        "title": "Message History",
        "body": "The conversation history is kept here. On-game correspondence belongs to the story; Off-game messages are player-to-player communication."
      },
      {
        "selector": ".messages_components_messagecomposer_form_action",
        "title": "Write a Reply",
        "body": "Choose whether the reply is On-game or Off-game, write the message, and send it. On-game messages are character correspondence; Off-game messages are written by the player."
      }
    ]
  },
  "instant-chat": {
    "key": "instant-chat",
    "label": "Instant Chat",
    "steps": [
      {
        "selector": ".components_instant_chat_instant_chat_dock_section_section_2, .components_instant_chat_instant_chat_dock_section_section",
        "title": "Instant Chat",
        "body": "Instant Chat is for quick off-game conversation. It is separate from in-character Location play and from persistent Private Messages."
      },
      {
        "selector": ".components_instant_chat_instant_chat_dock_input_field, .components_instant_chat_instant_chat_dock_header_header",
        "title": "Choose a Character",
        "body": "Use the contact list and search to find a character. Existing conversations are kept easy to reach from the dock."
      },
      {
        "selector": ".components_instant_chat_instant_chat_dock_div_container_4, .components_instant_chat_instant_chat_dock_div_container_12",
        "title": "Conversation",
        "body": "Messages appear in the compact chat window. The conversation can be minimised or closed without leaving the page you are using."
      },
      {
        "selector": ".components_instant_chat_instant_chat_dock_textarea_off_game_message, .components_instant_chat_instant_chat_dock_input_field",
        "title": "Send an Off-game Message",
        "body": "Type your message here. Press Enter to send, or use Shift+Enter when you need a new line."
      }
    ]
  },
  "ancestries": {
    "key": "ancestries",
    "label": "Ancestries",
    "steps": [
      {
        "selector": ".ancestries_page_header_header",
        "title": "Ancestries",
        "body": "Ancestries describe the peoples and lineages of Aureth. They influence identity, appearance, lore and character mechanics."
      },
      {
        "selector": ".ancestries_page_div_container",
        "title": "Explore the Available Ancestries",
        "body": "Browse the current entries before choosing or researching an Ancestry."
      },
      {
        "selector": "a[href^=\"/ancestries/\"]",
        "title": "Open an Ancestry",
        "body": "Select an Ancestry to open its full Codex entry, including its lore and mechanical information."
      }
    ]
  },
  "ancestry-detail": {
    "key": "ancestry-detail",
    "label": "Ancestry Entry",
    "steps": [
      {
        "selector": ".ancestries_slug_page_div_container",
        "title": "An Ancestry Entry",
        "body": "This is the full entry for one Ancestry. It brings together the public lore and character-facing information for that lineage."
      },
      {
        "selector": ".ancestries_slug_page_div_container section, .ancestries_slug_page_div_container article",
        "title": "Read the Entry",
        "body": "Move through the sections to understand the Ancestry's identity, traits and other information used when creating or playing a character."
      }
    ]
  },
  "associations": {
    "key": "associations",
    "label": "Associations",
    "steps": [
      {
        "selector": ".associations_page_header_header",
        "title": "Associations",
        "body": "Associations are major social and professional structures within Sepulchria."
      },
      {
        "selector": ".associations_page_div_container",
        "title": "Browse the Associations",
        "body": "Explore the available Associations to understand their roles, identity and place within the city."
      },
      {
        "selector": "a[href^=\"/associations/\"]",
        "title": "Open an Association",
        "body": "Select an Association for its full entry and the Orders connected to it."
      }
    ]
  },
  "association-detail": {
    "key": "association-detail",
    "label": "Association Entry",
    "steps": [
      {
        "selector": ".associations_slug_page_div_container",
        "title": "An Association Entry",
        "body": "This page explains one Association in detail and shows the public information connected to it."
      },
      {
        "selector": ".associations_slug_page_div_container section, .associations_slug_page_div_container article",
        "title": "Association Details",
        "body": "Read through its description and related structures, including Orders associated with this part of Sepulchrian society."
      },
      {
        "selector": "a[href^=\"/orders/\"]",
        "title": "Related Orders",
        "body": "Where Orders are listed, select one to open its dedicated entry."
      }
    ]
  },
  "orders": {
    "key": "orders",
    "label": "Orders",
    "steps": [
      {
        "selector": ".orders_page_header_header",
        "title": "Orders",
        "body": "Orders are organised bodies with their own identities, roles, levels and links to Associations."
      },
      {
        "selector": ".orders_page_div_container",
        "title": "Browse the Orders",
        "body": "Use this directory to explore the Orders currently active in Sepulchria."
      },
      {
        "selector": "a[href^=\"/orders/\"]",
        "title": "Open an Order",
        "body": "Select an Order to read its full entry, hierarchy and public membership information."
      }
    ]
  },
  "order-detail": {
    "key": "order-detail",
    "label": "Order Entry",
    "steps": [
      {
        "selector": ".orders_slug_page_section_section",
        "title": "An Order",
        "body": "The Order header introduces its identity, imagery, Association and public summary."
      },
      {
        "selector": ".orders_slug_page_section_section_2",
        "title": "About the Order",
        "body": "This section contains the Order's longer description and public background."
      },
      {
        "selector": ".orders_slug_page_section_section_3",
        "title": "Levels & Roles",
        "body": "The hierarchy explains the roles and levels within the Order. Your own access may reveal additional information where appropriate."
      },
      {
        "selector": ".orders_slug_page_section_section_4",
        "title": "Members",
        "body": "Public members of the Order are listed here. Select a character to open their public profile."
      }
    ]
  },
  "warping": {
    "key": "warping",
    "label": "Warping",
    "steps": [
      {
        "selector": ".warping_page_header_header",
        "title": "Warping and Shapes",
        "body": "Warping is the shaping of the Current through known Shapes. This catalogue contains the active Shapes available in Sepulchria."
      },
      {
        "selector": ".components_warping_shapes_catalogue_section_section",
        "title": "Find a Shape",
        "body": "Search by name, Word or description, or filter the catalogue by Level, School, Movement, target and effect nature. Reset clears every filter."
      },
      {
        "selector": ".components_warping_shapes_catalogue_article_article",
        "title": "A Shape",
        "body": "Each Shape card is a complete rules reference. It brings together the Shape's identity, activation requirements, targeting, resolution and mechanical effects."
      },
      {
        "selector": ".components_warping_shapes_catalogue_p_text_11",
        "title": "School, Word, Movement, Duration and Price",
        "body": "The metadata line identifies the Shape's School, Word of Power, Movement and duration. Where a Price applies, hover or inspect it for the named Price associated with shaping it."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_13",
        "title": "Level, Nature and Target",
        "body": "These badges show the Shape's Level, whether its effect is beneficial, harmful or mixed, who it can target, and whether it functions as a Dispel."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_14",
        "title": "Words and Components",
        "body": "Where configured, the expanded Shape information lists its component Words and whether verbal and movement components are required."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container",
        "title": "Resolution and Effects",
        "body": "Mechanical profile boxes explain how the Shape resolves against a target. Automatic profiles need no save; Save Required profiles show the DC, allowed saves and what happens on success. Effect badges describe damage, healing, Conditions and Attribute changes."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_21",
        "title": "Requirements",
        "body": "The Requirements section tells you what is needed to know or use the Shape, including the required Warping Affinity level and any minimum Attributes."
      }
    ]
  },
  "feats": {
    "key": "feats",
    "label": "Feats",
    "steps": [
      {
        "selector": ".feats_page_header_header",
        "title": "Feats",
        "body": "Feats are innate, learned or bestowed capabilities granted through Ancestries, Order Roles or general assignment."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_section_section",
        "title": "Find a Feat",
        "body": "Search the catalogue or filter by effect type, target, source type, Ancestry and Order. Reset clears all active filters."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_article_article",
        "title": "A Feat",
        "body": "Each Feat card is a rules reference showing what the Feat is, where it comes from, how it targets, how it resolves and what it changes mechanically."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_7",
        "title": "Target, Success and Timing",
        "body": "These boxes explain who the Feat can affect, whether activation is automatic or requires a roll, its duration and any cooldown before it can be used again."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_8",
        "title": "Mechanical Effects",
        "body": "The Effects section lists direct damage, healing, Health changes, Attribute modifiers, Warping Affinity changes and other configured mechanical effects."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_10",
        "title": "How the Feat Is Obtained",
        "body": "Available through tells you whether the Feat comes from an Ancestry, an Order, general assignment, or a combination of those sources."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_article_article .border-t",
        "title": "Advanced Mechanics",
        "body": "Some Feats use Shape-backed advanced mechanics. When present, these sections describe target scope, duration, automatic or opposed resolution, and separate Self, Other or harmful-target effects."
      }
    ]
  },
  "character-profile": {
    "key": "character-profile",
    "label": "Character Sheet · Profile",
    "steps": [
      {
        "selector": ".character-sheet-tabs nav[aria-label=\"Character sheet sections\"]",
        "title": "Profile Tab",
        "body": "The tabs move between every part of your Character Sheet without leaving the sheet. Profile contains the fuller public-facing description of the character."
      },
      {
        "selector": "[data-character-sheet-panel=\"profile\"]",
        "title": "Full Profile",
        "body": "This tab expands beyond In Short and gathers the character's descriptive roleplay information in one place."
      },
      {
        "selector": "[data-character-sheet-panel=\"profile\"] .character_page_h2_heading",
        "title": "Profile Sections",
        "body": "The profile is divided into readable sections such as Physical Description, Personality, Biography, Public Notes and Relationships when those fields contain information."
      },
      {
        "selector": "[data-character-sheet-panel=\"profile\"] .character_page_p_text_8",
        "title": "Public Character Information",
        "body": "These longer text blocks are the information other players use to understand and roleplay with your character. Edit them from the Edit tab when your character is allowed to change them."
      }
    ]
  },
  "character-inventory": {
    "key": "character-inventory",
    "label": "Character Sheet · Inventory",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"inventory\"]",
        "title": "Inventory",
        "body": "Inventory is the complete possession system for your character. It includes carried Items, equipped Items, containers, item mechanics and the actions available to you."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_inventory_2",
        "title": "Possessions",
        "body": "This is the full carried Inventory, not just what is equipped. The record count includes the Items currently carried by the character."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_42",
        "title": "Search and Filter Your Items",
        "body": "Search by name and filter by category, subcategory, quality, body slot, status and whether you meet the Item's requirements. Filters update immediately and Reset filters clears them."
      },
      {
        "selector": ".components_characters_character_inventory_browser_section_section",
        "title": "Equipment",
        "body": "Equipment is the wearable/equippable view. Expand or collapse it to see the body slots and what is currently equipped. Empty slots can offer compatible carried Items to equip."
      },
      {
        "selector": ".components_characters_character_inventory_browser_section_section_4",
        "title": "Carried Item Categories",
        "body": "Possessed Items are grouped by category below Equipment. Each category can be expanded or collapsed and shows how many matching Items it contains."
      },
      {
        "selector": ".components_characters_character_inventory_browser_article_article",
        "title": "A Possessed Item",
        "body": "The tutorial opens the first carried category. An Item card shows name, quantity, category, quality, description, equipment state, use mechanics, effects and requirements.",
        "prepare": "open-first-inventory-category"
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_19",
        "title": "Item Actions",
        "body": "Owned Items expose the actions that apply to them. Depending on the Item, you can Use it, target another character, move it into or out of containers, equip or unequip it, and discard it."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_13",
        "title": "Requirements",
        "body": "Requirements show whether your character meets the conditions for an Item, including Attributes, Ancestry, Order, Role or Order level where configured."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_8",
        "title": "Item State",
        "body": "An Item can also report active cooldowns, temporary effects, charge information or reasons why an action is currently unavailable."
      }
    ]
  },
  "character-ledger": {
    "key": "character-ledger",
    "label": "Character Sheet · Ledger",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"ledger\"]",
        "title": "Ledger",
        "body": "The Ledger is your character's permanent economy history."
      },
      {
        "selector": ".components_characters_character_remnants_wallet_section_section",
        "title": "Current Remnants",
        "body": "Your current Remnant balance is shown with the Ledger so you can compare the present purse with the transactions that produced it."
      },
      {
        "selector": ".components_characters_character_ledger_div_immutable_ledger",
        "title": "Immutable Ledger",
        "body": "Ledger history is intentionally immutable. Entries record where Remnants were gained or spent rather than being manually editable."
      },
      {
        "selector": ".components_characters_character_ledger_section_section",
        "title": "Transaction History",
        "body": "Every available transaction is listed here with its economy information. Use this history to trace purchases, rewards, jobs and other Remnant changes."
      }
    ]
  },
  "character-trophies": {
    "key": "character-trophies",
    "label": "Character Sheet · Trophies",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"trophies\"]",
        "title": "Trophies",
        "body": "Trophies record achievements, distinctions and progress your character has earned."
      },
      {
        "selector": ".components_characters_character_trophies_display_header_header",
        "title": "Trophy Overview",
        "body": "The header explains the collection and shows the total number of Trophies available to display here."
      },
      {
        "selector": ".components_characters_character_trophies_display_section_section_2",
        "title": "Trophy Groups",
        "body": "Trophies are organised into groups. Each group shows how many achievements it contains."
      },
      {
        "selector": ".components_characters_character_trophies_display_div_container_7",
        "title": "A Trophy",
        "body": "Each Trophy entry shows its identity, description and progress or completion information where the achievement has stages."
      },
      {
        "selector": ".components_characters_character_trophies_display_div_container_11",
        "title": "Progress",
        "body": "Progress-based Trophies show your current progress toward their threshold and whether the next stage has been reached."
      }
    ]
  },
  "character-feats": {
    "key": "character-feats",
    "label": "Character Sheet · Feats",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"gifts\"]",
        "title": "Your Feats",
        "body": "This tab contains only the Feats actually owned by your character."
      },
      {
        "selector": ".components_characters_character_gifts_display_header_header",
        "title": "Owned Feats",
        "body": "The header tells you how many Feats belong to the character."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_section_section",
        "title": "Filter Your Feats",
        "body": "Search your owned Feats and filter them by effect and target so you can quickly find the capability you need."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_article_article",
        "title": "Feat Details",
        "body": "A Feat card explains its source, activation type, target, success resolution, duration, cooldown and direct mechanical effects."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_7",
        "title": "Target, Success and Timing",
        "body": "These boxes tell you who the Feat affects, whether it is automatic or rolled, and how long it lasts before any cooldown."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_8",
        "title": "Effects",
        "body": "Effects show damage, healing, Health or Attribute changes, Warping modifiers and other mechanics applied by the Feat."
      }
    ]
  },
  "character-warping": {
    "key": "character-warping",
    "label": "Character Sheet · Warping",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"warping\"]",
        "title": "Your Warping",
        "body": "This tab contains the Shapes actually known by your character."
      },
      {
        "selector": ".components_characters_character_shapes_display_header_header",
        "title": "Known Shapes",
        "body": "The header shows how many Shapes the character currently knows."
      },
      {
        "selector": ".components_warping_shapes_catalogue_section_section",
        "title": "Find a Known Shape",
        "body": "Search and filter known Shapes by Level, School, Movement, target and nature."
      },
      {
        "selector": ".components_warping_shapes_catalogue_article_article",
        "title": "A Known Shape",
        "body": "Each Shape card gives the complete play reference: School, Word, Movement, duration, Price, target, nature, components, resolution and effects."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_21",
        "title": "Shape Requirements",
        "body": "Requirements show the Warping Affinity and minimum Attributes needed for that Shape."
      }
    ]
  },
  "character-offgame": {
    "key": "character-offgame",
    "label": "Character Sheet · Offgame",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"offgame\"]",
        "title": "Offgame",
        "body": "Offgame contains player-facing information about the character that is not part of the in-character fiction."
      },
      {
        "selector": "[data-character-sheet-panel=\"offgame\"] .character_page_h2_heading",
        "title": "Offgame Notes",
        "body": "Use these notes for information another player should know without treating it as something their character automatically knows."
      },
      {
        "selector": "[data-character-sheet-panel=\"offgame\"] .character_page_p_text_8",
        "title": "Player-facing Information",
        "body": "This text can clarify OOC context or other player information attached to the character. It can be changed from the Edit tab when editing is available."
      }
    ]
  },
  "character-log": {
    "key": "character-log",
    "label": "Character Sheet · Log",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"audit\"]",
        "title": "Character Log",
        "body": "The Log records significant system and character changes over time."
      },
      {
        "selector": ".components_characters_character_audit_trail_div_character_log",
        "title": "Audit History",
        "body": "The header explains the character audit trail. This history is for tracing recorded changes rather than editing them."
      },
      {
        "selector": ".components_characters_character_audit_trail_section_section",
        "title": "Recorded Changes",
        "body": "Entries appear in the audit area as the system records changes. If loading fails, the Retry control lets you request the history again."
      },
      {
        "selector": ".components_characters_character_audit_trail_button_retry",
        "title": "Retry",
        "body": "If the audit history cannot be loaded, Retry requests it again without leaving the Character Sheet."
      }
    ]
  },
  "character-edit": {
    "key": "character-edit",
    "label": "Character Sheet · Edit",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"edit\"]",
        "title": "Edit",
        "body": "Edit contains every self-service control currently available for your character."
      },
      {
        "selector": ".components_characters_character_conditions_editor_div_container",
        "title": "Conditions",
        "body": "The Conditions editor lets you review the character's current Conditions and, where permitted, add or remove the self-managed Conditions exposed here."
      },
      {
        "selector": ".components_characters_character_conditions_editor_select_select",
        "title": "Choose a Condition",
        "body": "Select an available Condition and use the adjacent controls to add it. Existing removable Conditions expose their own remove control."
      },
      {
        "selector": ".character_page_section_edit_character",
        "title": "Full Character Editor",
        "body": "When the character is still editable through the full creation/editor flow, Open character editor takes you there."
      },
      {
        "selector": ".character_page_section_section_5",
        "title": "Edit Profile",
        "body": "Approved characters can update their portrait and public profile information here without reopening the full character-creation flow."
      },
      {
        "selector": ".character_page_input_show_last_activity",
        "title": "Last Activity Privacy",
        "body": "Choose whether other players may see this character's Last Activity. Staff can still see it for administration."
      },
      {
        "selector": ".character_page_input_show_inventory",
        "title": "Inventory Privacy",
        "body": "Choose whether other players can see carried Inventory. Equipped Items remain public even when the rest of the Inventory is hidden."
      },
      {
        "selector": ".character_page_div_container_40",
        "title": "Save Profile Changes",
        "body": "Save profile changes applies the editable approved-profile fields and privacy choices."
      },
      {
        "selector": ".components_characters_display_trophy_selector_section_section",
        "title": "Displayed Trophies",
        "body": "Choose which earned Trophies appear in the character's display slots, then save the display selection."
      }
    ]
  },
  "forum": {
    "key": "forum",
    "label": "Forum",
    "steps": [
      {
        "selector": ".forum_page_main_main, .forum_page_section_section",
        "title": "The Forum",
        "body": "The Forum hosts longer-form discussions. Sections may be off-game or in-game and can have different access rules."
      },
      {
        "selector": ".forum_page_section_section",
        "title": "Forum Sections",
        "body": "Each section has its own topic list, description and activity information. Unread activity is highlighted where applicable."
      },
      {
        "selector": ".section_slug_forum_link",
        "title": "Open a Section",
        "body": "Select a section to see its discussions and any subsections available inside it."
      }
    ]
  },
  "forum-section": {
    "key": "forum-section",
    "label": "Forum Section",
    "steps": [
      {
        "selector": ".forum_sectionslug_page_main_main",
        "title": "A Forum Section",
        "body": "A section groups discussions around a particular subject or in-game/off-game purpose."
      },
      {
        "selector": ".forum_sectionslug_page_section_section_2",
        "title": "Current Conversations",
        "body": "Pinned and regular discussions are listed here. Unread discussions are visually distinguished."
      },
      {
        "selector": "[data-forum-topic-row=\"true\"]",
        "title": "Discussion Rows",
        "body": "Each row shows the discussion, author/activity information and its current state. Select one to open the topic."
      },
      {
        "selector": "a[href$=\"/new\"]",
        "title": "Create a Discussion",
        "body": "When you have permission to post in this section, use this control to begin a new discussion."
      }
    ]
  },
  "forum-topic": {
    "key": "forum-topic",
    "label": "Forum Topic",
    "steps": [
      {
        "selector": ".forum_sectionslug_topicslug_page_header_header",
        "title": "A Forum Topic",
        "body": "The topic header shows the discussion title, status and basic activity statistics."
      },
      {
        "selector": ".forum_sectionslug_topicslug_page_section_section",
        "title": "Posts",
        "body": "The discussion is presented as a sequence of posts. Available actions can include quoting, reporting, editing or moderation depending on your permissions."
      },
      {
        "selector": "#reply",
        "title": "Reply",
        "body": "When the topic and section allow you to post, the reply area at the bottom lets you continue the discussion."
      }
    ]
  },
  "market": {
    "key": "market",
    "label": "Market",
    "steps": [
      {
        "selector": ".market_page_div_container_2",
        "title": "The Market",
        "body": "The Market contains in-world shops where your character can buy and, where supported, sell items using Remnants."
      },
      {
        "selector": ".market_page_div_container_3",
        "title": "Shops",
        "body": "Each shop has its own stock and identity. Open a shop to see what it currently offers."
      },
      {
        "selector": "a[href^=\"/market/\"]",
        "title": "Enter a Shop",
        "body": "Select a shop card to open its catalogue and your current balance for that shop visit."
      }
    ]
  },
  "market-shop": {
    "key": "market-shop",
    "label": "Market Shop",
    "steps": [
      {
        "selector": ".market_slug_page_div_container_4",
        "title": "A Market Shop",
        "body": "The shop header identifies the shop and shows your currently available Remnants. Purchases and sales use the normal character economy."
      },
      {
        "selector": ".components_market_market_catalogue_section_section",
        "title": "Search and Filter the Stock",
        "body": "Search by item name or description and filter by category, subcategory, quality, item type, price, effects, stock availability and affordability. Reset clears the filters."
      },
      {
        "selector": ".components_market_market_catalogue_article_article",
        "title": "An Item Listing",
        "body": "Each listing is an actual shop item. It shows the item's image, name, quality, category, description, purchase price and the mechanics relevant to that item."
      },
      {
        "selector": ".components_market_market_catalogue_div_container_6",
        "title": "Item Properties and Effects",
        "body": "The badges and details on the item explain properties such as usable or equippable state, equipment slot, charges, cooldown, targeting, success roll, damage and passive or use-based effects."
      },
      {
        "selector": ".components_market_market_catalogue_button_action",
        "title": "Buying Items",
        "body": "Choose the quantity beside Buy. The shop calculates the total and prevents the purchase if you cannot afford it or finite stock is too low. A successful purchase adds the item through the inventory system."
      },
      {
        "selector": ".components_market_market_catalogue_button_action_2",
        "title": "Selling Items",
        "body": "When a shop buys that item and you own eligible copies, choose how many to sell and press Sell. The listing shows how many sellable copies you own and how many Remnants you will receive."
      },
      {
        "selector": ".components_market_market_catalogue_span_text",
        "title": "Prices and Stock",
        "body": "Prices are shown in Remnants. Finite-stock items can sell out, while unlimited listings remain available. Your wallet balance and the item-level totals help you check a transaction before confirming it."
      }
    ]
  },
  "daily-missions": {
    "key": "daily-missions",
    "label": "Daily Missions",
    "steps": [
      {
        "selector": ".missions_page_header_daily_missions",
        "title": "Daily Missions",
        "body": "Daily Missions give you optional objectives that reset each day. Complete as many as you wish before the daily reset."
      },
      {
        "selector": "#daily-milestones",
        "title": "Daily Milestones",
        "body": "Completing qualifying missions advances the day's milestones. Milestone rewards must be claimed when they become available."
      },
      {
        "selector": "#daily-missions",
        "title": "Mission Families",
        "body": "Missions are grouped into families. Each card explains what is required and tracks its progress."
      },
      {
        "selector": "[data-mission-card]",
        "title": "Complete and Claim",
        "body": "Mission cards update as you perform actions across Sepulchria. When a mission or milestone is complete, claim its reward here before reset."
      }
    ]
  },
  "polls": {
    "key": "polls",
    "label": "Polls",
    "steps": [
      {
        "selector": ".polls_page_section_polls",
        "title": "Polls",
        "body": "Polls are off-game votes addressed to eligible characters or accounts. Eligibility is checked by the server."
      },
      {
        "selector": "[data-public-poll-id]",
        "title": "A Poll",
        "body": "Each poll explains the question, its current state and the choices available to you."
      },
      {
        "selector": "[data-public-poll-id] form, [data-public-poll-id] button",
        "title": "Cast Your Vote",
        "body": "Choose the allowed option or options and submit your vote. Whether you can change it later depends on that poll's settings."
      }
    ]
  },
  "hall-of-renown": {
    "key": "hall-of-renown",
    "label": "Hall of Renown",
    "steps": [
      {
        "selector": ".ranking_page_header_header",
        "title": "The Hall of Renown",
        "body": "The Hall of Renown presents public leaderboards based on recorded achievements and activity across Sepulchria."
      },
      {
        "selector": ".ranking_page_div_container_3",
        "title": "The Current Board",
        "body": "This list shows the characters ranked for the board you are currently viewing."
      },
      {
        "selector": "a[href^=\"/ranking?board=\"], a[href^=\"/characters/\"]",
        "title": "Explore the Rankings",
        "body": "Switch between Hall boards to view different forms of renown, or open a listed character's public sheet."
      }
    ]
  },
  "players-handbook": {
    "key": "players-handbook",
    "label": "Player's Handbook",
    "steps": [
      {
        "selector": ".components_rules_public_rules_header_header",
        "title": "Player's Handbook",
        "body": "The Player's Handbook contains the official off-game rules and gameplay documentation for Sepulchria."
      },
      {
        "selector": ".components_rules_public_rules_input_field",
        "title": "Search the Handbook",
        "body": "Search entry titles, summaries and rule text to find the rule you need quickly."
      },
      {
        "selector": ".components_rules_public_rules_nav_navigation",
        "title": "Rule Categories",
        "body": "Use the category navigation to narrow the Handbook to a particular group of rules."
      },
      {
        "selector": ".components_rules_public_rules_button_glossary",
        "title": "Glossary",
        "body": "The Glossary is available from the same interface for quick definitions of Sepulchria terminology."
      }
    ]
  },
  "tickets": {
    "key": "tickets",
    "label": "Tickets",
    "steps": [
      {
        "selector": ".support_page_div_ticket_centre",
        "title": "Ticket Centre",
        "body": "The Ticket Centre is where you contact Sepulchria staff for support and follow existing requests."
      },
      {
        "selector": "a[href=\"/support/new\"]",
        "title": "Open a New Ticket",
        "body": "Use Open New Ticket when you need help with a new issue. You will be able to choose the category, add a subject and describe the problem."
      },
      {
        "selector": ".support_page_div_container_3",
        "title": "Your Tickets",
        "body": "Existing tickets are listed here with their reference, category, subject, status and last update time. Unread staff activity is highlighted and counted."
      },
      {
        "selector": ".support_page_div_container_3 a",
        "title": "Open a Ticket",
        "body": "Select a ticket to read the full conversation and reply to staff while the ticket remains open."
      }
    ]
  },
  "ticket-new": {
    "key": "ticket-new",
    "label": "Open a Ticket",
    "steps": [
      {
        "selector": ".support_new_page_h1_open_ticket",
        "title": "Open a Ticket",
        "body": "Use this form to create a new support request for Sepulchria staff."
      },
      {
        "selector": ".support_new_page_select_category",
        "title": "Choose the Category",
        "body": "Choose the category that best matches the request: General Support, Technical Problem, Account, Bug, Rules Question or Payment / Premium."
      },
      {
        "selector": ".support_new_page_input_subject",
        "title": "Subject",
        "body": "Give the ticket a concise subject so the issue is easy to identify in the Ticket Centre."
      },
      {
        "selector": ".support_new_page_textarea_body",
        "title": "Describe the Issue",
        "body": "Explain what you need help with and include the information staff will need to understand or reproduce the issue."
      },
      {
        "selector": ".support_new_page_button_submit_ticket",
        "title": "Submit Ticket",
        "body": "Submit creates the ticket and adds it to your Ticket Centre, where you can follow replies and continue the conversation."
      }
    ]
  },
  "ticket-detail": {
    "key": "ticket-detail",
    "label": "Support Ticket",
    "steps": [
      {
        "selector": ".support_reference_page_div_container_2",
        "title": "Ticket Details",
        "body": "The ticket header shows the public reference, category, subject, opening date and current status."
      },
      {
        "selector": ".support_reference_page_div_container_3",
        "title": "Ticket Conversation",
        "body": "Messages between you and Sepulchria staff are kept here in chronological order so the full support history remains available."
      },
      {
        "selector": ".support_reference_page_form_reply_support_ticket",
        "title": "Reply to Staff",
        "body": "While the ticket is open, write your reply here and press Send Reply. Closed tickets keep their history but no longer accept replies."
      },
      {
        "selector": "a[href=\"/support\"]",
        "title": "Return to the Ticket Centre",
        "body": "Use Ticket Centre to return to the full list of your support requests."
      }
    ]
  },
  "codex": {
    "key": "codex",
    "label": "Codex",
    "steps": [
      {
        "selector": ".components_codex_public_codex_main_main_2",
        "title": "The Codex of the First",
        "body": "The Codex is the public lore record of Aureth and Sepulchria, organised into chapters."
      },
      {
        "selector": ".components_codex_public_codex_nav_codex_chapters, nav[aria-label=\"Codex chapters\"]",
        "title": "Choose a Chapter",
        "body": "Use the chapter navigation to move between entries without leaving the Codex."
      },
      {
        "selector": ".components_codex_public_codex_section_codex_chapter",
        "title": "Chapter Header",
        "body": "The chapter header identifies the current entry. When narration is available, the Read player lets you listen to the chapter."
      },
      {
        "selector": "#codex-chapter",
        "title": "Read the Chapter",
        "body": "The main reading pane contains the selected chapter. Previous and Next controls let you continue through the Codex."
      }
    ]
  }
};
