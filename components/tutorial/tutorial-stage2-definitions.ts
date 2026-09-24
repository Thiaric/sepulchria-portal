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
        "selector": ".components_world_world_indicator_div_container_13",
        "title": "Aureth's Time and Weather",
        "body": "This window expands the compact world indicator from the Portal header. It combines Aureth's calendar, current weather and lunar information."
      },
      {
        "selector": ".components_world_world_indicator_div_container_18",
        "title": "World Conditions",
        "body": "The weather area shows the current conditions and temperature used across the portal's atmospheric systems."
      },
      {
        "selector": ".components_world_world_indicator_div_container_18, .components_world_world_indicator_div_container_23",
        "title": "Calendar Information",
        "body": "Use the calendar to understand the current Aureth date and review relevant calendar information and events."
      }
    ]
  },
  "city-people": {
    "key": "city-people",
    "label": "People in Sepulchria",
    "steps": [
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_2",
        "title": "People in Sepulchria",
        "body": "This live presence view shows characters who are currently active in the city."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_7",
        "title": "Search the City",
        "body": "Search by character, Ancestry, Order, Association, Location or status to find the people you are looking for."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_11",
        "title": "Presence Cards",
        "body": "Each card shows public identity and presence information. Private Location information remains hidden unless you are allowed to see it."
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
        "body": "Portal Skins change the visual appearance of Sepulchria without changing gameplay."
      },
      {
        "selector": ".components_portal_portal_appearance_modal_div_container",
        "title": "Preview Your Skins",
        "body": "Browse the appearances available to your account. You can preview a skin before deciding whether to use it."
      },
      {
        "selector": ".components_portal_portal_appearance_modal_header_drag_move_portal_appearance",
        "title": "A Movable Window",
        "body": "On desktop this window can be moved so you can compare a skin preview with the portal beneath it."
      }
    ]
  },
  "notifications": {
    "key": "notifications",
    "label": "Notifications",
    "steps": [
      {
        "selector": ".components_notifications_notification_bell_div_container_2",
        "title": "Notifications",
        "body": "Notifications collect important off-game updates and shortcuts to activity that may need your attention."
      },
      {
        "selector": ".components_notifications_notification_bell_div_container_5",
        "title": "Notification Controls",
        "body": "You can mute notification alerts and mark current notifications as read from the top of the panel."
      },
      {
        "selector": ".components_notifications_notification_bell_div_container_6",
        "title": "Your Notification Feed",
        "body": "Open a notification to go to the relevant part of the portal. Unread counters update as notifications are read."
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
        "title": "Warping",
        "body": "Warping is the use of the Current through known Shapes. This catalogue contains the active Shapes available in the game world."
      },
      {
        "selector": ".warping_page_div_container",
        "title": "The Shape Catalogue",
        "body": "Browse Shapes to understand what they do, how they are used and any requirements or mechanics attached to them."
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
        "body": "Feats are innate, learned or bestowed capabilities available through sources such as Ancestries, Orders and general assignment."
      },
      {
        "selector": ".feats_page_div_container",
        "title": "The Feat Catalogue",
        "body": "Browse active Feats to understand their descriptions and mechanical effects before using or pursuing them."
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
        "body": "The Profile tab contains the fuller public-facing description of who your character is."
      },
      {
        "selector": "[data-character-sheet-panel=\"profile\"]",
        "title": "Your Profile",
        "body": "Use this section to review the character's descriptive, biographical and roleplay information."
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
        "body": "Inventory contains the items your character currently owns and the controls available for those items."
      },
      {
        "selector": "[data-character-sheet-panel=\"inventory\"] button, [data-character-sheet-panel=\"inventory\"] article",
        "title": "Items and Actions",
        "body": "Select or inspect items to see their details, quantities, equipment state and any actions available from the character sheet."
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
        "body": "The Ledger records your character's Remnant activity and other economy information exposed on the sheet."
      },
      {
        "selector": "[data-character-sheet-panel=\"ledger\"] table, [data-character-sheet-panel=\"ledger\"] article, [data-character-sheet-panel=\"ledger\"] section",
        "title": "Transaction History",
        "body": "Use the Ledger entries to understand where Remnants were earned, spent or otherwise changed."
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
        "body": "Trophies represent achievements and distinctions your character has earned."
      },
      {
        "selector": "[data-character-sheet-panel=\"trophies\"] button, [data-character-sheet-panel=\"trophies\"] article",
        "title": "Your Collection",
        "body": "Review earned Trophies and, where supported, choose which ones you want displayed with your character."
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
        "body": "This tab lists the Feats currently belonging to your character."
      },
      {
        "selector": "[data-character-sheet-panel=\"gifts\"] article, [data-character-sheet-panel=\"gifts\"] section",
        "title": "Feat Details",
        "body": "Read each Feat's source and mechanics here. Feats that can be actively used are normally invoked from the appropriate gameplay controls."
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
        "body": "This tab records the Shapes and Warping information currently available to your character."
      },
      {
        "selector": "[data-character-sheet-panel=\"warping\"] article, [data-character-sheet-panel=\"warping\"] section",
        "title": "Shapes and Current",
        "body": "Use this area to review what your character knows and the mechanical information relevant to Warping."
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
        "body": "Offgame information is player-facing information that is not part of the in-character fiction."
      },
      {
        "selector": "[data-character-sheet-panel=\"offgame\"] section, [data-character-sheet-panel=\"offgame\"] article",
        "title": "Player-facing Information",
        "body": "Use this tab for the off-game details provided on the character sheet."
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
        "body": "The Log provides a history of recorded changes and significant system activity associated with your character."
      },
      {
        "selector": "[data-character-sheet-panel=\"audit\"] article, [data-character-sheet-panel=\"audit\"] table, [data-character-sheet-panel=\"audit\"] section",
        "title": "Audit History",
        "body": "Entries help you trace changes over time and understand where recorded updates came from."
      }
    ]
  },
  "character-edit": {
    "key": "character-edit",
    "label": "Character Sheet · Edit",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"edit\"]",
        "title": "Edit Your Character",
        "body": "The Edit tab contains the character fields you are currently allowed to change."
      },
      {
        "selector": "[data-character-sheet-panel=\"edit\"] form",
        "title": "Save Your Changes",
        "body": "Update the available fields carefully and use the form's save controls to apply your changes."
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
        "selector": ".market_slug_page_section_section",
        "title": "A Market Shop",
        "body": "This is a specific shop. The header introduces the shop and shows information relevant to shopping here."
      },
      {
        "selector": ".market_slug_page_div_container, .market_slug_page_main_main",
        "title": "Browse the Stock",
        "body": "Review available items, their prices and their details before making a purchase."
      },
      {
        "selector": ".market_slug_page_main_main button, .market_slug_page_main_main form",
        "title": "Buy and Sell",
        "body": "Use the available item controls to complete market actions. Remnant changes are recorded through the normal economy system."
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
