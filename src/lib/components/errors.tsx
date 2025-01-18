
type ErrorPageProps = {
  heading: string;
  subheading?: string;
  details?: string;
}

export const ErrorPage = ({
  heading,
  subheading,
  details
}: ErrorPageProps) => {
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

export const NotFound = () => {
  return <Error error={error} message={404} details={page not exist}/>
}
