
type ErrorViewProps = {
  heading: string;
  subheading?: string;
  details?: string;
}

export const ErrorView = ({
  heading,
  subheading,
  details,
}: ErrorViewProps) => {
  return (
    <div>
      <h1>
        {heading}
      </h1>
      {subheading && (
        <h2>
          {subheading}
        </h2>
      )}
      {details && (
        <p>
          {details}
        </p>
      )}
      <a href="/">
        Return to safety
      </a>
    </div>
  );
};
