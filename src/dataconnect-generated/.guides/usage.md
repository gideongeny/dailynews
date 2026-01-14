# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createPublicMovieList, getPublicMovieLists, addMovieToMovieList, getMyMovieLists } from '@dataconnect/generated';


// Operation CreatePublicMovieList:  For variables, look at type CreatePublicMovieListVars in ../index.d.ts
const { data } = await CreatePublicMovieList(dataConnect, createPublicMovieListVars);

// Operation GetPublicMovieLists: 
const { data } = await GetPublicMovieLists(dataConnect);

// Operation AddMovieToMovieList:  For variables, look at type AddMovieToMovieListVars in ../index.d.ts
const { data } = await AddMovieToMovieList(dataConnect, addMovieToMovieListVars);

// Operation GetMyMovieLists: 
const { data } = await GetMyMovieLists(dataConnect);


```