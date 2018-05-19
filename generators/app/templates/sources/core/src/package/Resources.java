package <%= projectPackage %>;

import javax.inject.Singleton;

import dagger.Component;

@Component
@Singleton
public interface Resources {
    ResourceProvider resources();
}
