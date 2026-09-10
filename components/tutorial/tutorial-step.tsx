import { Checkbox } from "../ui/checkbox";

export function TutorialStep({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative components_tutorial_tutorial_step_li_item">
      <Checkbox
        id={title}
        name={title}
        className={`absolute top-[3px] mr-2 peer`}
      />
      <label
        htmlFor={title}
        className={[((`relative text-base text-foreground peer-checked:line-through font-medium`)), "components_tutorial_tutorial_step_label_label"].filter(Boolean).join(" ")}
      >
        <span className="ml-8 components_tutorial_tutorial_step_span_text">{title}</span>
        <div
          className={[((`ml-8 text-sm peer-checked:line-through font-normal text-muted-foreground`)), "components_tutorial_tutorial_step_div_container"].filter(Boolean).join(" ")}
        >
          {children}
        </div>
      </label>
    </li>
  );
}
